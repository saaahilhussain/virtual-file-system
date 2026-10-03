// Run on EC2 with its encrypted runtime configuration. Uses only a disposable
// account and generated data; credentials, cookies and signed URLs are not logged.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from '../../server/node_modules/mongoose/index.js';
import User from '../../server/models/userModel.js';
import Directory from '../../server/models/directoryModel.js';
import File from '../../server/models/fileModel.js';
import Share from '../../server/models/shareModel.js';
import Cleanup from '../../server/models/storageCleanupModel.js';
import redis, {connectRedis} from '../../server/config/redis.js';
import {getUserSessionKeys} from '../../server/services/sessionService.js';
import {withStorageTransaction, removeFiles} from '../../server/services/storageService.js';
import {deleteS3Files} from '../../server/services/s3Service.js';

const base='https://api.fileshelter.app';
const userId=new mongoose.Types.ObjectId();
const rootId=new mongoose.Types.ObjectId();
const email=`deployment-${crypto.randomUUID()}@fileshelter.invalid`;
const password=crypto.randomBytes(30).toString('base64url');
const content=Buffer.from('File Shelter production deployment check\n');
const results={};
let cookie='', phase='dependencies', seeded=false;
const keys=new Set();
async function request(path,method='GET',body,expected=200,extra={}) {
  const response=await fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Origin:'https://fileshelter.app',...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,expected,`${phase}: ${method} ${path.split('?')[0]} returned ${response.status}`);
  return response;
}
try {
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:12000});
  await connectRedis();
  const session=await mongoose.startSession();
  try { await session.withTransaction(async()=>{
    await Directory.create([{_id:rootId,name:`root-${email}`,userId,parentDirId:null,path:[rootId]}],{session});
    await User.create([{_id:userId,name:'Deployment Verification',email,password,rootDirId:rootId,role:'user',authProviders:['local']}],{session});
  }); seeded=true; } finally { await session.endSession(); }

  phase='login';
  const login=await request('/user/login','POST',{email,password});
  const sid=login.headers.getSetCookie().find(x=>x.startsWith('sid='));
  assert(sid && /HttpOnly/i.test(sid) && /Secure/i.test(sid) && /SameSite=Lax/i.test(sid));
  assert.equal(login.headers.get('access-control-allow-origin'),'https://fileshelter.app');
  assert.equal(login.headers.get('access-control-allow-credentials'),'true');
  cookie=sid.split(';')[0];
  assert.equal((await (await request('/user')).json()).usedStorage,0);
  results.login=true; results.secureSessionCookie=true; results.cors=true;

  phase='folder';
  await request('/directory','POST',undefined,200,{dirname:'Deployment Check'});
  const folder=(await (await request('/directory')).json()).items.find(x=>x.name==='Deployment Check'&&x.isDirectory);
  assert(folder); const folderId=String(folder.id);
  results.folder=true;

  phase='upload';
  const upload=await (await request('/file/upload/initiate','POST',{name:'deployment-check.txt',size:content.length,parentDirId:folderId,contentType:'text/plain'},201)).json();
  keys.add(`${upload.fileId}.txt`);
  const put=await fetch(upload.uploadUrl,{method:'PUT',signal:AbortSignal.timeout(20000),body:content,headers:{'Content-Type':'text/plain','Content-Length':String(content.length)}});
  assert.equal(put.status,200);
  await request('/file/upload/complete','POST',{fileId:upload.fileId});
  await request('/file/upload/complete','POST',{fileId:upload.fileId});
  assert.equal((await (await request('/user')).json()).usedStorage,content.length);
  results.upload=true; results.idempotentCompletion=true; results.quotaAccounting=true;

  phase='preview-download';
  for(const download of [false,true]) {
    const redirect=await request(`/file/${upload.fileId}${download?'?action=download':''}`,'GET',undefined,302);
    const response=await fetch(redirect.headers.get('location'),{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200);
    assert.equal(await response.text(),content.toString());
    assert(response.headers.get('content-disposition').startsWith(download?'attachment;':'inline;'));
  }
  results.preview=true; results.download=true;

  phase='sharing';
  const share=(await (await request('/share','POST',{resourceType:'file',resourceId:upload.fileId},201)).json()).share;
  const anonymous=await fetch(`${base}/public/share/${share.token}`,{signal:AbortSignal.timeout(20000)});
  assert.equal(anonymous.status,200);
  await request(`/share/${share.id}`,'DELETE');
  const revoked=await fetch(`${base}/public/share/${share.token}`,{signal:AbortSignal.timeout(20000)});
  assert.equal(revoked.status,404);
  results.shareAndRevoke=true;

  phase='trash-restore';
  await request(`/file/${upload.fileId}`,'DELETE');
  assert.equal((await (await request('/user')).json()).usedStorage,0);
  await request(`/file/${upload.fileId}/restore`,'PATCH');
  assert.equal((await (await request('/user')).json()).usedStorage,content.length);
  await request(`/file/${upload.fileId}/permanent`,'DELETE');
  assert.equal((await (await request('/user')).json()).usedStorage,0);
  await request(`/directory/${folderId}`,'DELETE');
  await request(`/directory/${folderId}/restore`,'PATCH');
  await request(`/directory/${folderId}/permanent`,'DELETE');
  results.trashRestoreAndDelete=true;

  phase='logout';
  await request('/user/logout','POST',undefined,204);
  await request('/user','GET',undefined,401);
  results.logoutRevokesSession=true;
} catch(error) {
  results.failedPhase=phase;
  results.errorName=error.name;
  process.exitCode=1;
} finally {
  let cleanupPhase='metadata';
  try {
    if(seeded) {
      for(const file of await File.find({userId}).lean())keys.add(`${file._id}${file.extension}`);
      for(const job of await Cleanup.find({userId}).lean())keys.add(job._id);
      cleanupPhase='sessions';
      const sessionKeys=await getUserSessionKeys(String(userId));
      for(const key of sessionKeys)await redis.del(key);
      cleanupPhase='database';
      await withStorageTransaction(userId,async({session})=>{
        await removeFiles(await File.find({userId}).session(session),userId,session);
        await Share.deleteMany({ownerId:userId},{session});
        await Directory.deleteMany({userId},{session});
        await User.deleteOne({_id:userId,email},{session});
      });
      cleanupPhase='s3';
      if(keys.size) {
        const deletion=await deleteS3Files([...keys].map(Key=>({Key})));
        assert.equal(deletion.Errors.length,0);
      }
      cleanupPhase='final-validation';
      await Cleanup.deleteMany({userId});
      assert.equal(await User.countDocuments({_id:userId}),0);
      assert.equal(await Directory.countDocuments({userId}),0);
      assert.equal(await File.countDocuments({userId}),0);
      results.disposableAccountRemoved=true;
    }
  } catch(error) { results.cleanupFailed=true; results.cleanupPhase=cleanupPhase; results.cleanupErrorName=error.name; results.cleanupErrorCode=error.code; results.cleanupAccountId=String(userId); process.exitCode=1; }
  if(redis.isOpen)await redis.quit();
  await mongoose.disconnect();
  console.log(JSON.stringify(results));
}

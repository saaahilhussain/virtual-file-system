import json
ACCOUNT='821656895501'
REGION='ap-south-1'
async def api(service,operation,params):
    return await call_boto3(service_name=service,operation_name=operation,region_name=REGION,params=params)
assert (await api('sts','GetCallerIdentity',{}))['Account']==ACCOUNT
name='file-shelter-audit'
bucket=f'file-shelter-logs-{ACCOUNT}-mumbai'
trails=(await api('cloudtrail','DescribeTrails',{'includeShadowTrails':False}))['trailList']
other=[t for t in trails if t['Name']!=name]
assert not other, 'Existing trail found; inspect first to avoid duplicate management-event charges'
arn=f'arn:aws:cloudtrail:{REGION}:{ACCOUNT}:trail/{name}'
policy=json.loads((await api('s3','GetBucketPolicy',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT}))['Policy'])
policy['Statement']=[s for s in policy['Statement'] if not s.get('Sid','').startswith('FileShelterCloudTrail')]
policy['Statement'] += [
 {'Sid':'FileShelterCloudTrailACL','Effect':'Allow','Principal':{'Service':'cloudtrail.amazonaws.com'},'Action':'s3:GetBucketAcl','Resource':f'arn:aws:s3:::{bucket}','Condition':{'StringEquals':{'aws:SourceArn':arn,'aws:SourceAccount':ACCOUNT}}},
 {'Sid':'FileShelterCloudTrailWrite','Effect':'Allow','Principal':{'Service':'cloudtrail.amazonaws.com'},'Action':'s3:PutObject','Resource':f'arn:aws:s3:::{bucket}/audit/AWSLogs/{ACCOUNT}/*','Condition':{'StringEquals':{'aws:SourceArn':arn,'aws:SourceAccount':ACCOUNT,'s3:x-amz-acl':'bucket-owner-full-control'}}},
]
await api('s3','PutBucketPolicy',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'Policy':json.dumps(policy)})
if not trails:
    await api('cloudtrail','CreateTrail',{'Name':name,'S3BucketName':bucket,'S3KeyPrefix':'audit','IncludeGlobalServiceEvents':True,'IsMultiRegionTrail':True,'EnableLogFileValidation':True,'TagsList':[{'Key':'Project','Value':'file-shelter'},{'Key':'Environment','Value':'demo'}]})
await api('cloudtrail','StartLogging',{'Name':arn})
result=await api('cloudtrail','GetTrailStatus',{'Name':arn})
result

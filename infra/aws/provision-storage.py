# Execute through AWS MCP aws___run_script; call_boto3 is provided by its sandbox.
# PUBLIC_KEY_PEM is injected from the protected local signing-key preparation.
import json
from botocore.exceptions import ClientError

ACCOUNT = '821656895501'
REGION = 'ap-south-1'
TAGS = [{'Key':'Project','Value':'file-shelter'},{'Key':'Environment','Value':'demo'},{'Key':'ManagedBy','Value':'codex-mcp'}]
identity = await call_boto3(service_name='sts', operation_name='GetCallerIdentity', region_name=REGION, params={})
assert identity['Account'] == ACCOUNT and ':assumed-role/AccountFullAccessRole/' in identity['Arn'], 'Unexpected deployment identity'

async def api(service, operation, params, region=REGION):
    return await call_boto3(service_name=service, operation_name=operation, region_name=region, params=params)

async def cf(operation, params):
    return await api('cloudfront', operation, params, 'us-east-1')

buckets = {kind:f'file-shelter-{kind}-{ACCOUNT}-mumbai' for kind in ['frontend','files','logs','artifacts']}
existing = {b['Name'] for b in (await api('s3','ListBuckets',{})).get('Buckets',[])}
for kind, bucket in buckets.items():
    if bucket not in existing:
        await api('s3','CreateBucket',{'Bucket':bucket,'CreateBucketConfiguration':{'LocationConstraint':REGION},'ObjectOwnership':'BucketOwnerEnforced'})
    else:
        owner_tags = (await api('s3','GetBucketTagging',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT}))['TagSet']
        assert {'Key':'Project','Value':'file-shelter'} in owner_tags, 'Refusing to alter an unrelated bucket'
    await api('s3','PutBucketTagging',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'Tagging':{'TagSet':TAGS}})
    await api('s3','PutPublicAccessBlock',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'PublicAccessBlockConfiguration':{'BlockPublicAcls':True,'IgnorePublicAcls':True,'BlockPublicPolicy':True,'RestrictPublicBuckets':True}})
    await api('s3','PutBucketEncryption',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'ServerSideEncryptionConfiguration':{'Rules':[{'ApplyServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]}})
    if kind == 'frontend':
        await api('s3','PutBucketVersioning',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'VersioningConfiguration':{'Status':'Enabled'}})
        rules=[{'ID':'ExpirePreviousReleases','Status':'Enabled','Filter':{'Prefix':''},'NoncurrentVersionExpiration':{'NoncurrentDays':7}},{'ID':'RemoveExpiredDeleteMarkers','Status':'Enabled','Filter':{'Prefix':''},'Expiration':{'ExpiredObjectDeleteMarker':True}}]
    elif kind in ['logs','artifacts']:
        rules=[{'ID':'ExpireLogs','Status':'Enabled','Filter':{'Prefix':''},'Expiration':{'Days':30}}]
    else:
        # File cleanup deletes bytes permanently. Versioning would retain hidden
        # bytes and break that storage/cost contract, so leave it disabled here.
        rules=[{'ID':'AbortIncompleteMultipartUploads','Status':'Enabled','Filter':{'Prefix':''},'AbortIncompleteMultipartUpload':{'DaysAfterInitiation':1}}]
    await api('s3','PutBucketLifecycleConfiguration',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'LifecycleConfiguration':{'Rules':rules}})
    if kind == 'files':
        await api('s3','PutBucketCors',{'Bucket':bucket,'ExpectedBucketOwner':ACCOUNT,'CORSConfiguration':{'CORSRules':[{'AllowedOrigins':['https://fileshelter.app','https://www.fileshelter.app','https://preview.fileshelter.app'],'AllowedMethods':['PUT','GET','HEAD'],'AllowedHeaders':['*'],'ExposeHeaders':['ETag','Content-Length','Content-Disposition'],'MaxAgeSeconds':3600}]}})

public_keys = (await cf('ListPublicKeys',{})).get('PublicKeyList',{}).get('Items',[])
matching_keys = [k for k in public_keys if k['Name']=='file-shelter-demo-signing']
if matching_keys:
    assert matching_keys[0]['EncodedKey'].strip()==PUBLIC_KEY_PEM.strip(), 'Signing key differs; do not rotate silently'
    public_key_id=matching_keys[0]['Id']
else:
    public_key_id=(await cf('CreatePublicKey',{'PublicKeyConfig':{'CallerReference':'file-shelter-demo-signing-20261004','Name':'file-shelter-demo-signing','EncodedKey':PUBLIC_KEY_PEM,'Comment':'File Shelter demo signed downloads'}}))['PublicKey']['Id']
groups=(await cf('ListKeyGroups',{})).get('KeyGroupList',{}).get('Items',[])
matching_groups=[g['KeyGroup'] for g in groups if g['KeyGroup']['KeyGroupConfig']['Name']=='file-shelter-demo-files']
key_group_id=matching_groups[0]['Id'] if matching_groups else (await cf('CreateKeyGroup',{'KeyGroupConfig':{'Name':'file-shelter-demo-files','Items':[public_key_id],'Comment':'File Shelter authorized file downloads'}}))['KeyGroup']['Id']

policies=(await cf('ListCachePolicies',{'Type':'custom'})).get('CachePolicyList',{}).get('Items',[])
cache_ids={}
for kind in ['frontend','files']:
    name=f'file-shelter-demo-{kind}'
    match=[p['CachePolicy'] for p in policies if p['CachePolicy']['CachePolicyConfig']['Name']==name]
    config={'Name':name,'Comment':'Respect origin cache directives; isolate download dispositions','MinTTL':0,'DefaultTTL':300,'MaxTTL':86400,'ParametersInCacheKeyAndForwardedToOrigin':{'EnableAcceptEncodingGzip':kind=='frontend','EnableAcceptEncodingBrotli':kind=='frontend','HeadersConfig':{'HeaderBehavior':'none'},'CookiesConfig':{'CookieBehavior':'none'},'QueryStringsConfig':({'QueryStringBehavior':'whitelist','QueryStrings':{'Quantity':1,'Items':['response-content-disposition']}} if kind=='files' else {'QueryStringBehavior':'none'})}}
    cache_ids[kind]=match[0]['Id'] if match else (await cf('CreateCachePolicy',{'CachePolicyConfig':config}))['CachePolicy']['Id']

managed_headers=(await cf('ListResponseHeadersPolicies',{'Type':'managed'}))['ResponseHeadersPolicyList']['Items']
headers_id=next(h['ResponseHeadersPolicy']['Id'] for h in managed_headers if h['ResponseHeadersPolicy']['ResponseHeadersPolicyConfig']['Name']=='Managed-SecurityHeadersPolicy')
headers=(await cf('ListResponseHeadersPolicies',{'Type':'custom'})).get('ResponseHeadersPolicyList',{}).get('Items',[])
match=[h['ResponseHeadersPolicy'] for h in headers if h['ResponseHeadersPolicy']['ResponseHeadersPolicyConfig']['Name']=='file-shelter-demo-frontend']
frontend_headers={'Name':'file-shelter-demo-frontend','Comment':'Browser security without blocking OAuth or payment providers','SecurityHeadersConfig':{'StrictTransportSecurity':{'Override':True,'AccessControlMaxAgeSec':31536000},'ContentTypeOptions':{'Override':True},'FrameOptions':{'Override':True,'FrameOption':'DENY'},'ReferrerPolicy':{'Override':True,'ReferrerPolicy':'strict-origin-when-cross-origin'},'ContentSecurityPolicy':{'Override':True,'ContentSecurityPolicy':"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"}}}
frontend_headers_id=match[0]['Id'] if match else (await cf('CreateResponseHeadersPolicy',{'ResponseHeadersPolicyConfig':frontend_headers}))['ResponseHeadersPolicy']['Id']

oacs=(await cf('ListOriginAccessControls',{})).get('OriginAccessControlList',{}).get('Items',[])
distributions=(await cf('ListDistributions',{})).get('DistributionList',{}).get('Items',[])
created={}
for kind in ['frontend','files']:
    name=f'file-shelter-demo-{kind}'
    oac_match=[o for o in oacs if o['Name']==name]
    oac_id=oac_match[0]['Id'] if oac_match else (await cf('CreateOriginAccessControl',{'OriginAccessControlConfig':{'Name':name,'Description':'Private S3 origin for File Shelter','SigningProtocol':'sigv4','SigningBehavior':'always','OriginAccessControlOriginType':'s3'}}))['OriginAccessControl']['Id']
    origin={'Id':kind,'DomainName':f'{buckets[kind]}.s3.{REGION}.amazonaws.com','OriginAccessControlId':oac_id,'S3OriginConfig':{'OriginAccessIdentity':''}}
    behavior={'TargetOriginId':kind,'ViewerProtocolPolicy':'redirect-to-https','AllowedMethods':{'Quantity':2,'Items':['GET','HEAD'],'CachedMethods':{'Quantity':2,'Items':['GET','HEAD']}},'CachePolicyId':cache_ids[kind],'ResponseHeadersPolicyId':frontend_headers_id if kind=='frontend' else headers_id,'Compress':kind=='frontend','TrustedKeyGroups':{'Enabled':kind=='files','Quantity':1 if kind=='files' else 0}}
    if kind=='files': behavior['TrustedKeyGroups']['Items']=[key_group_id]
    config={'CallerReference':f'file-shelter-{kind}-{ACCOUNT}-20261004','Comment':name,'Origins':{'Quantity':1,'Items':[origin]},'DefaultCacheBehavior':behavior,'Enabled':True,'Aliases':{'Quantity':0},'ViewerCertificate':{'CloudFrontDefaultCertificate':True},'Restrictions':{'GeoRestriction':{'RestrictionType':'none','Quantity':0}},'HttpVersion':'http2and3','IsIPV6Enabled':True,'PriceClass':'PriceClass_All','DefaultRootObject':'index.html' if kind=='frontend' else ''}
    if kind=='frontend':
        config['CustomErrorResponses']={'Quantity':2,'Items':[{'ErrorCode':code,'ResponsePagePath':'/index.html','ResponseCode':'200','ErrorCachingMinTTL':0} for code in [403,404]]}
    match=[d for d in distributions if d['Comment']==name]
    if match:
        assert any(o['DomainName']==origin['DomainName'] for o in match[0]['Origins']['Items']), 'Existing distribution origin differs'
        distribution=match[0]
    else:
        distribution=(await cf('CreateDistributionWithTags',{'DistributionConfigWithTags':{'DistributionConfig':config,'Tags':{'Items':TAGS}}}))['Distribution']
    created[kind]={'id':distribution['Id'],'arn':distribution['ARN'],'domain':distribution['DomainName'],'status':distribution['Status'],'oacId':oac_id}
    policy={'Version':'2012-10-17','Statement':[{'Sid':'CloudFrontRead','Effect':'Allow','Principal':{'Service':'cloudfront.amazonaws.com'},'Action':'s3:GetObject','Resource':f'arn:aws:s3:::{buckets[kind]}/*','Condition':{'StringEquals':{'AWS:SourceArn':distribution['ARN'],'AWS:SourceAccount':ACCOUNT}}},{'Sid':'RequireTLS','Effect':'Deny','Principal':'*','Action':'s3:*','Resource':[f'arn:aws:s3:::{buckets[kind]}',f'arn:aws:s3:::{buckets[kind]}/*'],'Condition':{'Bool':{'aws:SecureTransport':'false'}}}]}
    await api('s3','PutBucketPolicy',{'Bucket':buckets[kind],'ExpectedBucketOwner':ACCOUNT,'Policy':json.dumps(policy)})

# Standard logs omit queries/cookies, so signed URL credentials are not logged.
logs_bucket=buckets['logs']
log_policy={'Version':'2012-10-17','Statement':[{'Sid':'LogDeliveryACLCheck','Effect':'Allow','Principal':{'Service':'delivery.logs.amazonaws.com'},'Action':'s3:GetBucketAcl','Resource':f'arn:aws:s3:::{logs_bucket}','Condition':{'StringEquals':{'aws:SourceAccount':ACCOUNT},'ArnLike':{'aws:SourceArn':f'arn:aws:logs:us-east-1:{ACCOUNT}:delivery-source:*'}}},{'Sid':'LogDeliveryWrite','Effect':'Allow','Principal':{'Service':'delivery.logs.amazonaws.com'},'Action':'s3:PutObject','Resource':f'arn:aws:s3:::{logs_bucket}/AWSLogs/{ACCOUNT}/*','Condition':{'StringEquals':{'aws:SourceAccount':ACCOUNT,'s3:x-amz-acl':'bucket-owner-full-control'},'ArnLike':{'aws:SourceArn':f'arn:aws:logs:us-east-1:{ACCOUNT}:delivery-source:*'}}},{'Sid':'RequireTLS','Effect':'Deny','Principal':'*','Action':'s3:*','Resource':[f'arn:aws:s3:::{logs_bucket}',f'arn:aws:s3:::{logs_bucket}/*'],'Condition':{'Bool':{'aws:SecureTransport':'false'}}}]}
try:
    previous_log_policy=json.loads((await api('s3','GetBucketPolicy',{'Bucket':logs_bucket,'ExpectedBucketOwner':ACCOUNT}))['Policy'])
except ClientError as error:
    if error.response['Error']['Code'] != 'NoSuchBucketPolicy': raise
    previous_log_policy={'Statement':[]}
managed_log_sids={statement['Sid'] for statement in log_policy['Statement']}
log_policy['Statement'].extend(statement for statement in previous_log_policy['Statement'] if statement.get('Sid') not in managed_log_sids)
await api('s3','PutBucketPolicy',{'Bucket':logs_bucket,'ExpectedBucketOwner':ACCOUNT,'Policy':json.dumps(log_policy)})
destination=(await api('logs','PutDeliveryDestination',{'name':'file-shelter-cloudfront-s3','outputFormat':'json','deliveryDestinationConfiguration':{'destinationResourceArn':f'arn:aws:s3:::{logs_bucket}'},'tags':{'Project':'file-shelter'}},'us-east-1'))['deliveryDestination']['arn']
deliveries=(await api('logs','DescribeDeliveries',{},'us-east-1')).get('deliveries',[])
for kind, distribution in created.items():
    name=f'file-shelter-{kind}'
    await api('logs','PutDeliverySource',{'name':name,'resourceArn':distribution['arn'],'logType':'ACCESS_LOGS','tags':{'Project':'file-shelter'}},'us-east-1')
    match=[d for d in deliveries if d['deliverySourceName']==name and d['deliveryDestinationArn']==destination]
    delivery=match[0] if match else (await api('logs','CreateDelivery',{'deliverySourceName':name,'deliveryDestinationArn':destination,'recordFields':['date','time','x-edge-location','cs-method','cs-uri-stem','sc-status','x-edge-result-type','time-taken','ssl-protocol','ssl-cipher','sc-bytes'],'tags':{'Project':'file-shelter'}},'us-east-1'))['delivery']
    distribution['logDeliveryId']=delivery['id']
result={'account':ACCOUNT,'region':REGION,'buckets':buckets,'distributions':created,'publicKeyId':public_key_id,'keyGroupId':key_group_id,'cachePolicyIds':cache_ids}
result

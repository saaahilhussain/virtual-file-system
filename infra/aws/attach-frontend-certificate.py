# Execute through AWS MCP. Certificate CNAMEs must already resolve publicly.
from botocore.exceptions import ClientError

ACCOUNT='821656895501'
CERT='arn:aws:acm:us-east-1:821656895501:certificate/b059fcd0-fd0f-46fb-b324-45069fc0c7fa'
DIST='E1GKIK1Q7BCJ3R'
identity=await call_boto3(service_name='sts',operation_name='GetCallerIdentity',region_name='ap-south-1',params={})
assert identity['Account']==ACCOUNT
cert=(await call_boto3(service_name='acm',operation_name='DescribeCertificate',region_name='us-east-1',params={'CertificateArn':CERT}))['Certificate']
if cert['Status']!='ISSUED':
    result={'certificateStatus':cert['Status'],'updated':False}
else:
    response=await call_boto3(service_name='cloudfront',operation_name='GetDistributionConfig',region_name='us-east-1',params={'Id':DIST})
    config=response['DistributionConfig']
    assert config['Comment']=='file-shelter-demo-frontend'
    config['ViewerCertificate']={'ACMCertificateArn':CERT,'SSLSupportMethod':'sni-only','MinimumProtocolVersion':'TLSv1.2_2025'}
    desired=['fileshelter.app','www.fileshelter.app','preview.fileshelter.app']
    config['Aliases']={'Quantity':len(desired),'Items':desired}
    conflict=False
    try:
        updated=await call_boto3(service_name='cloudfront',operation_name='UpdateDistribution',region_name='us-east-1',params={'Id':DIST,'IfMatch':response['ETag'],'DistributionConfig':config})
    except ClientError as error:
        if error.response['Error']['Code']!='CNAMEAlreadyExists': raise
        conflict=True
        config['Aliases']={'Quantity':1,'Items':['preview.fileshelter.app']}
        updated=await call_boto3(service_name='cloudfront',operation_name='UpdateDistribution',region_name='us-east-1',params={'Id':DIST,'IfMatch':response['ETag'],'DistributionConfig':config})
    distribution=updated['Distribution']
    result={'certificateStatus':cert['Status'],'updated':True,'status':distribution['Status'],'aliases':distribution['DistributionConfig']['Aliases'],'oldAccountAliasConflict':conflict}
result

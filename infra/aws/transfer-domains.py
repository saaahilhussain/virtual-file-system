# Cross-account CloudFront transfer after certificate and DNS TXT verification.
from botocore.exceptions import ClientError

DIST='E1GKIK1Q7BCJ3R'
identity=await call_boto3(service_name='sts',operation_name='GetCallerIdentity',region_name='ap-south-1',params={})
assert identity['Account']=='821656895501'
distribution=await call_boto3(service_name='cloudfront',operation_name='GetDistribution',region_name='us-east-1',params={'Id':DIST})
assert distribution['Distribution']['DistributionConfig']['Comment']=='file-shelter-demo-frontend'
assert distribution['Distribution']['DistributionConfig']['ViewerCertificate'].get('ACMCertificateArn')=='arn:aws:acm:us-east-1:821656895501:certificate/b059fcd0-fd0f-46fb-b324-45069fc0c7fa'
output=[]
if distribution['Distribution']['Status']!='Deployed':
    output.append({'status':'AwaitingCertificateDeployment'})
else:
    for domain in ['fileshelter.app','www.fileshelter.app']:
        conflicts=await call_boto3(service_name='cloudfront',operation_name='ListDomainConflicts',region_name='us-east-1',params={'Domain':domain,'DomainControlValidationResource':{'DistributionId':DIST}})
        latest=await call_boto3(service_name='cloudfront',operation_name='GetDistributionConfig',region_name='us-east-1',params={'Id':DIST})
        try:
            moved=await call_boto3(service_name='cloudfront',operation_name='UpdateDomainAssociation',region_name='us-east-1',params={'Domain':domain,'TargetResource':{'DistributionId':DIST},'IfMatch':latest['ETag']})
            output.append({'domain':domain,'moved':True,'resourceId':moved['ResourceId']})
        except ClientError as error:
            output.append({'domain':domain,'moved':False,'errorCode':error.response['Error']['Code'],'reason':error.response['Error']['Message'],'conflicts':conflicts.get('DomainConflicts',[])})
result=output
result

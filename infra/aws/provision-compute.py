# AWS MCP sandbox program. Inject BOOTSTRAP_BASE64 and GENERATED_S3_POLICY_JSON.
import json
from botocore.exceptions import ClientError

ACCOUNT='821656895501'
REGION='ap-south-1'
TAGS=[{'Key':'Project','Value':'file-shelter'},{'Key':'Environment','Value':'demo'},{'Key':'ManagedBy','Value':'codex-mcp'}]
async def api(service,operation,params):
    return await call_boto3(service_name=service,operation_name=operation,region_name=REGION,params=params)
identity=await api('sts','GetCallerIdentity',{})
assert identity['Account']==ACCOUNT and ':assumed-role/AccountFullAccessRole/' in identity['Arn'], 'Wrong account/principal'
role_name='FileShelterDemoEC2Role'
trust={'Version':'2012-10-17','Statement':[{'Effect':'Allow','Principal':{'Service':'ec2.amazonaws.com'},'Action':'sts:AssumeRole'}]}
try:
    role=(await api('iam','GetRole',{'RoleName':role_name}))['Role']
    assert {'Key':'Project','Value':'file-shelter'} in role.get('Tags',[]), 'Existing role is unrelated'
except ClientError as error:
    if error.response['Error']['Code']!='NoSuchEntity': raise
    role=(await api('iam','CreateRole',{'RoleName':role_name,'AssumeRolePolicyDocument':json.dumps(trust),'Description':'File Shelter demo instance: SSM management and its own S3 objects','Tags':TAGS}))['Role']
await api('iam','AttachRolePolicy',{'RoleName':role_name,'PolicyArn':'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'})
await api('iam','PutRolePolicy',{'RoleName':role_name,'PolicyName':'FileShelterFiles','PolicyDocument':GENERATED_S3_POLICY_JSON})
artifact_policy={'Version':'2012-10-17','Statement':[{'Effect':'Allow','Action':'s3:GetObject','Resource':'arn:aws:s3:::file-shelter-artifacts-821656895501-mumbai/releases/*'}]}
await api('iam','PutRolePolicy',{'RoleName':role_name,'PolicyName':'FileShelterReleaseRead','PolicyDocument':json.dumps(artifact_policy)})
try:
    profile=(await api('iam','GetInstanceProfile',{'InstanceProfileName':role_name}))['InstanceProfile']
except ClientError as error:
    if error.response['Error']['Code']!='NoSuchEntity': raise
    profile=(await api('iam','CreateInstanceProfile',{'InstanceProfileName':role_name,'Tags':TAGS}))['InstanceProfile']
if not any(r['RoleName']==role_name for r in profile.get('Roles',[])):
    await api('iam','AddRoleToInstanceProfile',{'InstanceProfileName':role_name,'RoleName':role_name})

vpcs=(await api('ec2','DescribeVpcs',{'Filters':[{'Name':'is-default','Values':['true']}]}))['Vpcs']
assert len(vpcs)==1, 'Default VPC not unique'
vpc=vpcs[0]['VpcId']
subnets=(await api('ec2','DescribeSubnets',{'Filters':[{'Name':'vpc-id','Values':[vpc]},{'Name':'default-for-az','Values':['true']}]}))['Subnets']
subnet=next(s['SubnetId'] for s in subnets if s['AvailabilityZone']=='ap-south-1a')
groups=(await api('ec2','DescribeSecurityGroups',{'Filters':[{'Name':'vpc-id','Values':[vpc]},{'Name':'group-name','Values':['file-shelter-demo-web']}]}))['SecurityGroups']
if groups:
    group=groups[0]
    assert {'Key':'Project','Value':'file-shelter'} in group.get('Tags',[]), 'Existing security group is unrelated'
    group_id=group['GroupId']
else:
    group_id=(await api('ec2','CreateSecurityGroup',{'GroupName':'file-shelter-demo-web','Description':'Public HTTP HTTPS API only; administration uses SSM','VpcId':vpc,'TagSpecifications':[{'ResourceType':'security-group','Tags':TAGS}]}))['GroupId']
    # The API is public for recruiters. HTTP is needed for ACME validation and
    # redirects, HTTPS for normal use. No SSH or Node/database port is public.
    await api('ec2','AuthorizeSecurityGroupIngress',{'GroupId':group_id,'IpPermissions':[{'IpProtocol':'tcp','FromPort':port,'ToPort':port,'IpRanges':[{'CidrIp':'0.0.0.0/0','Description':'Public API HTTPS' if port==443 else 'ACME validation and HTTPS redirects'}]} for port in [80,443]]})
image=(await api('ssm','GetParameter',{'Name':'/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id'}))['Parameter']['Value']
templates=(await api('ec2','DescribeLaunchTemplates',{'Filters':[{'Name':'launch-template-name','Values':['file-shelter-demo']}]}))['LaunchTemplates']
if templates:
    template_id=templates[0]['LaunchTemplateId']
    assert {'Key':'Project','Value':'file-shelter'} in templates[0].get('Tags',[]), 'Existing template is unrelated'
    latest=(await api('ec2','DescribeLaunchTemplateVersions',{'LaunchTemplateId':template_id,'Versions':['$Latest']}))['LaunchTemplateVersions'][0]
    if latest['LaunchTemplateData'].get('UserData')!=BOOTSTRAP_BASE64:
        latest=(await api('ec2','CreateLaunchTemplateVersion',{'LaunchTemplateId':template_id,'SourceVersion':str(latest['VersionNumber']),'VersionDescription':'Current File Shelter bootstrap','LaunchTemplateData':{'UserData':BOOTSTRAP_BASE64}}))['LaunchTemplateVersion']
    template_version=str(latest['VersionNumber'])
    await api('ec2','ModifyLaunchTemplate',{'LaunchTemplateId':template_id,'DefaultVersion':template_version})
else:
    data={'ImageId':image,'InstanceType':'t3.micro','IamInstanceProfile':{'Name':role_name},'SecurityGroupIds':[group_id],'MetadataOptions':{'HttpTokens':'required','HttpEndpoint':'enabled','HttpPutResponseHopLimit':1},'BlockDeviceMappings':[{'DeviceName':'/dev/sda1','Ebs':{'VolumeSize':16,'VolumeType':'gp3','Encrypted':True,'DeleteOnTermination':True}}],'CreditSpecification':{'CpuCredits':'standard'},'Monitoring':{'Enabled':False},'UserData':BOOTSTRAP_BASE64,'TagSpecifications':[{'ResourceType':'instance','Tags':TAGS+[{'Key':'Name','Value':'file-shelter-demo-api'}]},{'ResourceType':'volume','Tags':TAGS}]}
    template_id=(await api('ec2','CreateLaunchTemplate',{'LaunchTemplateName':'file-shelter-demo','ClientToken':'file-shelter-demo-template-20261004','VersionDescription':'Ubuntu24 Node24 PM2 Nginx demo','LaunchTemplateData':data,'TagSpecifications':[{'ResourceType':'launch-template','Tags':TAGS}]}))['LaunchTemplate']['LaunchTemplateId']
    template_version='1'
instances=(await api('ec2','DescribeInstances',{'Filters':[{'Name':'tag:Project','Values':['file-shelter']},{'Name':'instance-state-name','Values':['pending','running','stopping','stopped']}]}))['Reservations']
rows=[i for r in instances for i in r['Instances']]
assert len(rows)<=1, 'Multiple project instances'
if rows:
    instance_id=rows[0]['InstanceId']
else:
    # Instance-profile propagation can take time. The same RunInstances client
    # token makes a retry safe after propagation without launching duplicates.
    instance_id=(await api('ec2','RunInstances',{'ClientToken':'file-shelter-demo-instance-20261004','LaunchTemplate':{'LaunchTemplateId':template_id,'Version':template_version},'SubnetId':subnet,'MinCount':1,'MaxCount':1}))['Instances'][0]['InstanceId']
addresses=(await api('ec2','DescribeAddresses',{'Filters':[{'Name':'tag:Project','Values':['file-shelter']}]}))['Addresses']
assert len(addresses)==1, 'Expected one project Elastic IP'
address=addresses[0]
if address.get('InstanceId')!=instance_id:
    current=(await api('ec2','DescribeInstances',{'InstanceIds':[instance_id]}))['Reservations'][0]['Instances'][0]
    if current['State']['Name']=='running':
        await api('ec2','AssociateAddress',{'InstanceId':instance_id,'AllocationId':address['AllocationId'],'AllowReassociation':False})
result={'account':ACCOUNT,'region':REGION,'instanceId':instance_id,'publicIp':address['PublicIp'],'allocationId':address['AllocationId'],'securityGroupId':group_id,'launchTemplateId':template_id,'launchTemplateVersion':template_version,'instanceProfile':role_name,'instanceRoleArn':role['Arn'],'amiId':image,'bootstrapStatus':'check separately through SSM'}
result

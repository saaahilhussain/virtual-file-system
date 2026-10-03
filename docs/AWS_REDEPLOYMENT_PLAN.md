# File Shelter AWS redeployment plan

Prepared 3 October 2026; access verified 4 October 2026 through AWS MCP.
Status: AWS infrastructure is deployed. The original domains have been transferred
to the new CloudFront distribution and Cloudflare DNS targets updated. Backend
HTTPS, PM2 reboot recovery and live storage/session flows passed verification.

## Verified deployment target

- AWS profile: `file-shelter-admin`.
- Account: `821656895501`.
- Authentication role: `AccountFullAccessRole` (verified with MCP `GetCallerIdentity`).
- Region: Mumbai (`ap-south-1`); this supersedes the temporary Sydney instruction.
- Access is already configured; no new login or IAM administrator creation needed.

## Scope and assumptions

Recreate the application's AWS deployment in the new account: EC2, Nginx,
Node.js, S3, CloudFront, HTTPS, and deployment automation. This follows the
latest request for S3 + CloudFront and supersedes the earlier R2 proposal.
Reconnect the original MongoDB Atlas database and Redis Cloud service, as the
user confirmed. Do not recover old S3 objects or delete database records.
Preserve unrelated local changes in this checkout.

Confirmed region is Mumbai (`ap-south-1`), matching the current frontend workflow.
The user confirmed Cloudflare manages DNS and both frontend and private file
delivery should use S3 + CloudFront.
The instance is `t3.micro`, with standard CPU credits, a 16 GB encrypted gp3 disk
and one Elastic IP. AWS Price List API rates checked on 4 October 2026 give a
base estimate of $13.2852/month using 730 hours: compute $0.0112/hour, disk
$0.0912/GB-month, IPv4 $0.005/hour. S3 Standard starts at $0.025/GB-month in Mumbai.
Requests, data transfer, CloudFront, logs, tax and external provider plans are
additional. Free Tier plan lookup returned missing data; credit eligibility is
unverified. Budget alerts have not been configured.

## Access from this computer

AWS authentication is already configured with temporary credentials for
`file-shelter-admin`. AWS MCP verifies account `821656895501` and
`AccountFullAccessRole` before provisioning. Application and CI roles have
narrower access. No SSH key or additional administrator is needed.

When the local AWS login expires, run `aws login --profile file-shelter-admin
--region ap-south-1` and complete the sign-in in the browser. Keep all credential
values out of chat, source control and command output.

Cloudflare MCP is connected and was used for certificate validation, ownership
verification and the application DNS updates.
GitHub workflows use OIDC rather than AWS access keys, but their updated files
remain local and no GitHub deployment has run.

## Target architecture

| Component | Target |
| --- | --- |
| React frontend | Private frontend S3 bucket behind a public CloudFront distribution |
| API | One Ubuntu LTS EC2 instance, Nginx HTTPS proxy, Node.js 24 + PM2 |
| File bytes | Separate private S3 bucket, direct browser presigned PUT uploads |
| File reads | Separate CloudFront distribution requiring signed URLs |
| Metadata | Original MongoDB Atlas database; EC2 replica-set connectivity verified |
| Sessions | Existing Redis Cloud; JSON, Search and session index verified locally and on EC2 |
| Domains | `fileshelter.app` for frontend, `api.fileshelter.app` for API; file distribution hostname initially |
| Deployment | Existing test gates retained; GitHub OIDC roles and SSM deployment |

## Execution sequence

### 1. Account, cost, and dependency checks

- Verify the intended account, plan/credits/expiry, quotas, default VPC and region.
- Calculate an estimate covering EC2, EBS, public IPv4, S3, CloudFront, DNS and logs.
  Configure budget alerts; these do not impose a spending cap.
- Verify MongoDB transactions and Redis JSON/Search/index support. If credentials
  still exist locally, use them without displaying their values.
- Use the original database, as requested. Old metadata can refer to lost file
  bytes; new S3 buckets cannot restore those bytes. Do not silently delete rows.
- Confirm registrar/DNS control and identify any CloudFront alias conflict with
  the closed account. If necessary, use `preview.fileshelter.app` while recovering
  the apex alias through AWS's supported process.

### 2. Reproducible infrastructure and EC2

- Prepare version-controlled infrastructure definitions, bootstrap scripts and a
  resource inventory without embedded secrets; inspect the planned resources.
- Provision a small x86 Ubuntu LTS instance, encrypted gp3 root disk, stable
  public address, security group, and instance role. Choose its size after the
  dependency and price checks; do not run builds on a memory-constrained server.
- Use Systems Manager for administration and deployments. Public inbound traffic
  is limited to HTTP/HTTPS; the application/database ports remain private.
- Install Node.js 24, Nginx and PM2; run the app under a non-root account and enable
  startup after reboot. Configure log rotation and basic resource monitoring.
- Grant the instance role access only to the file bucket operations and deployment
  artifacts it needs, plus Systems Manager. Update the S3 client to use the SDK's
  role credential chain in production; its current configuration requires static
  access keys. Preserve explicit local/test credential support.

### 3. S3 and CloudFront

- Create two uniquely named buckets with encryption and public access blocked.
  Use S3 REST origins and CloudFront Origin Access Control, not public S3 website
  endpoints. Scope bucket read policies to the intended distributions.
- Frontend distribution: public viewer access, HTTPS, index document, React route
  fallback, cache policy separating HTML from fingerprinted assets.
- File bucket: CORS for the approved frontend origin and the headers used by
  presigned PUT uploads; keep lifecycle configuration aligned with the existing
  transactional cleanup design.
- File distribution: trusted key group and a new signing key pair, short-lived
  signed URLs; store the private signing key only in protected backend settings.
- Forward and cache on `response-content-disposition` so preview/download and
  renamed filenames do not reuse an incorrect cached response. Avoid forwarding
  CloudFront signing parameters to S3. Verify range requests and inline previews.
- Confirm unsigned CloudFront file requests and anonymous S3 reads are rejected.

### 4. HTTPS and application deployment

- Request and DNS-validate CloudFront's custom-domain ACM certificate in
  `us-east-1`. Configure Nginx's API certificate with automatic renewal.
- Proxy API requests to the local Node listener, retaining all current route
  paths. Set forwarded headers and verify secure session cookies and CORS.
  Keep frontend and API on the same site for existing `SameSite=Lax` sessions.
- Set the new bucket, distribution, key ID, API URL, client origin and application
  secrets in backend/frontend configuration. Never put backend secrets in `VITE_*`.
- Check MongoDB collections and supported validators, Redis `userIdIdx`, OAuth
  callbacks, Resend sender configuration and Razorpay webhook URL. Use test billing
  credentials for the recruiter demo unless live billing is explicitly needed.

### 5. Tests, release, and repeatable deployment

- Run existing frontend/backend tests and build; review existing lint debt rather
  than attributing unrelated failures to infrastructure work.
- Deploy the tested working-tree release. Record its source revision and local
  changes so the first deployment does not silently omit uncommitted work.
- Replace long-lived GitHub AWS keys with repository/branch-scoped OIDC roles.
  Deploy backend artifacts through SSM and keep secrets outside release folders.
  Keep the current test gates and wait for deployment success before reporting it.
- Verify sign-in, persistence across requests, folders, upload/completion retry,
  preview/download filenames, sharing, trash/restore, quota accounting and cleanup.
- Verify TLS, denied private reads, reboot recovery and CI deployment; only then
  switch the final DNS records. Leave previous records documented for rollback.
- Deliver the live URL, resource inventory, cost estimate, rollback/redeploy steps,
  secret locations (never values), and instructions to revoke deployment access.

## Information still needed

- Atlas Network Access permits `13.235.106.210/32`; the original `storageApp`
  database is connected from EC2. Rotate the database and Redis passwords shared
  in chat, then replace their values in encrypted SSM runtime configuration.
- Cloudflare certificate validation and application DNS are complete. Exact records are in
  [AWS_DNS_AND_ATLAS_SETUP.md](AWS_DNS_AND_ATLAS_SETUP.md).
- The OIDC deployment roles exist and their policies passed IAM Access Analyzer.
  Updated workflows are local only; CI has not been run in GitHub. Existing
  public frontend provider settings must still match the encrypted server settings.
- No checkout or real payment has been tested. Local provider configuration uses
  live Razorpay credentials, retained from the original deployment.

## Verified state

- MCP identity: account `821656895501`, `AccountFullAccessRole`.
- EC2: `i-0fd3ead0d7e6eaecf`, Elastic IP `13.235.106.210`, Ubuntu 24.04,
  Node.js `24.21.0`, PM2 `7.0.4`, Nginx installed and configuration validated.
- Frontend: `E1GKIK1Q7BCJ3R` / `d1poygmlu2bb31.cloudfront.net`; home and
  React route returned HTTP 200. ACM is issued and all three aliases are deployed.
- Files: `E3JEPZW12UFYVM` / `d2ne7s9kpc4c0k.cloudfront.net`; signed inline
  and download requests returned HTTP 200 with distinct correct filenames.
  Unsigned CloudFront and anonymous S3 requests returned HTTP 403.
- Private buckets, OAC, trusted signing key group, encrypted SSM settings,
  standard access logs excluding queries/cookies and CloudTrail are configured.
- Backend release from the tested working tree is installed. Atlas, Redis Cloud
  and instance-role S3 preflights passed. PM2 and Nginx return HTTP 200. An actual
  instance-role presigned upload returned HTTP 200, its byte length matched and
  deletion succeeded. Reboot recovery passed: PM2, Nginx and runtime secrets
  restored, Atlas/Redis/S3 passed, and API HTTPS returned HTTP 200.
- Live disposable-account verification passed login, secure session cookies,
  CORS, folders, upload, repeated completion, quota accounting, preview/download,
  sharing/revocation, trash/restore, permanent deletion and logout. All test
  accounts, sessions, metadata and uploaded objects were removed.
- Backend tests: 60 passed. Frontend tests: 19 passed. Production build passed.
- Source base: `dc6b7ee6dc88d15b2f596c2906160dc92c6fe7b2`, plus existing local
  work and deployment edits. No commit, push or repository reset was performed.

## References

- [AWS browser login for CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html)
- [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Systems Manager administration](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [Private CloudFront content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html)
- [CloudFront TLS certificate region](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)
- [Moving an existing CloudFront domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move-options.html)
- [GitHub OIDC roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [AWS account eligibility](https://aws.amazon.com/free/free-tier-faqs/)

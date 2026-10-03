# File Shelter deployment operations

AWS account `821656895501`, profile `file-shelter-admin`, region `ap-south-1`.
Administer instance `i-0fd3ead0d7e6eaecf` through Systems Manager. No SSH port or
key is required. The API runs as the `ubuntu` Linux user under PM2.

## Runtime settings

Encrypted SSM parameters in Mumbai:

- `/file-shelter/demo/server-env`: JSON application settings, original Atlas
  `storageApp` database, Redis Cloud and existing provider configuration.
- `/file-shelter/demo/cloudfront-private-key`: signed-download private key.

The app is available at `/home/ubuntu/file-shelter`, a symlink to its retained
release under `/home/ubuntu/releases`. The boot service reads these settings
through the instance role into `/home/ubuntu/file-shelter/server/.env`, mode
`0600`, owned by `ubuntu`. This file is now on the instance disk and ignored
by Git. Keep secrets out of Git, release archives, command output and chat.
EC2 uses temporary role credentials for S3.

After updating an encrypted parameter, run these through SSM:

```bash
sudo systemctl restart file-shelter-secrets
sudo -Hu ubuntu pm2 reload /home/ubuntu/file-shelter/infra/aws/ecosystem.config.cjs --update-env
sudo -Hu ubuntu pm2 save
curl --fail https://api.fileshelter.app/
```

Run `infra/aws/preflight.mjs` with `node --env-file=/home/ubuntu/file-shelter/server/.env`
as `ubuntu` to check Atlas, Redis JSON/Search and instance-role S3 access.
Password changes in Atlas or Redis must also be applied to the encrypted settings.

## Release and rollback

The backend workflow tests the server, uploads a secret-free archive to
`file-shelter-artifacts-821656895501-mumbai/releases/<commit>/backend.tar.gz`,
then runs `infra/aws/deploy-backend.sh <commit>` through SSM. The workflow uses
`FileShelterDemoBackendDeployRole` through GitHub OIDC on the main branch.
The relocated first release is `20261004-ubuntu` and includes the tested working
tree. The previous `/opt/file-shelter` installation is retained for rollback.

Backend releases stay under `/home/ubuntu/releases`. Each deployment clones
the public repository using HTTPS, checks out the exact tested commit on `main`,
verifies the packaged server matches that commit, installs dependencies and writes
its private `.env`. A successful preflight switches the app symlink and recreates
the PM2 process. Health-check failure switches back to the previous release.
The release installer preserves Certbot's Nginx HTTPS configuration.

Git on EC2 tracks `origin/main` and permits only fast-forward pulls. No GitHub
private key or token is needed for this public repository. To fetch changes manually:

```bash
sudo -Hu ubuntu git -C /home/ubuntu/file-shelter pull --ff-only origin main
```

The initial live snapshot contains uncommitted changes because the local working
tree has not yet been pushed. Preserve those changes; let the updated workflow
deploy the tested commit after they are published. A manual pull does not install
dependencies or restart PM2. Prefer the workflow for application updates.

For rollback, preflight a retained release with its own `server/.env`, switch
`/home/ubuntu/file-shelter` to it, run `systemctl daemon-reload`, recreate
`file-shelter-api` with the ecosystem configuration and save PM2. Check HTTPS
health afterward. Do not reset the database as part of a code rollback.

The frontend workflow tests and builds React, uploads the new private S3 build
and invalidates distribution `E1GKIK1Q7BCJ3R`. It uses
`FileShelterDemoFrontendDeployRole` through GitHub OIDC. Previous frontend object
versions are retained for seven days; restore matching HTML and asset versions
together, then invalidate the cache.

The backend workflow runs after changes to server code or AWS infrastructure.
The frontend runs after changes to client code, or through manual dispatch;
publishing deployment configuration alone keeps the current frontend build in
place. The frontend requires the existing public OAuth and Razorpay settings in
repository secrets; backend secrets stay in SSM. Review each run in GitHub Actions.

## HTTPS and domains

CloudFront uses the issued ACM certificate in `us-east-1`, covering
`fileshelter.app`, `www.fileshelter.app` and `preview.fileshelter.app`. Keep the
three validation CNAMEs for renewal. Domain ownership TXT records enabled AWS's
successful transfer from the closed account to the new distribution.

Nginx has the API certificate under `/etc/letsencrypt/live/api.fileshelter.app/`.
`certbot.timer` renews it automatically. Use `sudo certbot renew --dry-run` through
SSM to check renewal; keep port 80 available for validation and HTTPS redirects.

Application DNS targets and the former records are recorded in
`infra/aws/resources.json` and `infra/aws/dns-before.json`. The previous origins
belong to the closed account, so restoring their DNS is unlikely to restore service.

## Costs and access

At the verified Mumbai rates, continuous EC2, 16 GB gp3 and public IPv4 cost
about **$13.29/month** before credits, tax, S3, CloudFront, logs and provider plans.
Credit eligibility and budget alerts are unverified. CloudFront logs and the
CloudTrail archive expire after 30 days. File deletion tombstones follow the
application's existing retention rules.

To revoke CI deployment, remove or narrow the two deploy roles' GitHub trust
policies. Do not remove the instance role while the application needs S3 and SSM.
Sign out of the local AWS profile when its administrator access is no longer needed.

Existing configuration uses live Razorpay credentials. No real payment, email
delivery or OAuth provider sign-in was exercised by the deployment smoke check.

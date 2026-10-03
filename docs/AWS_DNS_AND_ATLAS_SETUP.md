# DNS and Atlas setup for the new deployment

Account: `821656895501`. Application region: Mumbai (`ap-south-1`).

## MongoDB Atlas

The user added `13.235.106.210/32` (the new EC2 Elastic IP) to the original Atlas
cluster's network access list. Replica-set and connection checks now pass from
EC2, using the original `storageApp` database. Keep database authentication enabled.

Redis Cloud connectivity, JSON, Search, and the `userIdIdx` session index passed
local and EC2 preflights. Keep this existing Redis service.

## Cloudflare certificate validation

These **CNAME** records were added through Cloudflare MCP with **DNS only** (gray cloud). Cloudflare can accept
the full names or names relative to `fileshelter.app`. Keep them for certificate
renewal. These records validate the new AWS certificate; they do not change where
the app currently serves traffic.

| Name | Target |
| --- | --- |
| `_5182321163b3bb45936f62132dc9c940` | `_5b41855f5ecec25caf992ab9bd7eae24.wzccmgtwzk.acm-validations.aws` |
| `_f2c348634fc1502124c1aeb7c6c52f82.www` | `_054b3143e2fbe0d7b1da6a25d3a4e4c1.wzccmgtwzk.acm-validations.aws` |
| `_22b5f73335b35b21e9b822258c7a4c33.preview` | `_d7616269ed0a83843213fefe9807a0e3.wzccmgtwzk.acm-validations.aws` |

## Application records

The API A record is `api` → `13.235.106.210`, DNS only. Let's Encrypt issued the
API HTTPS certificate and automatic renewal is enabled.

The new frontend distribution is `d1poygmlu2bb31.cloudfront.net`. AWS issued the
certificate and accepted the apex, `www` and `preview` aliases. Domain ownership
TXT records at `_.fileshelter.app` and `_www.fileshelter.app` point to that
distribution; AWS successfully transferred both existing aliases from the closed
account. Apex, `www` and `preview` CNAMEs now point to the new distribution with
DNS only. Sign-in, upload, quota accounting, signed preview/download, sharing,
trash/restore, logout and temporary-account cleanup passed against the live API.

Uploaded-file reads use `d2ne7s9kpc4c0k.cloudfront.net` with signed URLs; no new
Cloudflare file-domain record is required.

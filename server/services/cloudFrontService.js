import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const cloudFrontDistributionDomain = process.env.CLOUDFRONT_DOMAIN;
const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
const keyPairId = process.env.CLOUDFRONT_PUBLIC_ID;

export const createCloudFrontGetUrl = ({ Key, download = false, filename }) => {
  const disposition = `${download ? "attachment" : "inline"};filename="${filename}"`;
  const url = `${cloudFrontDistributionDomain}/${Key}?response-content-disposition=${encodeURIComponent(disposition)}`;
  const dateLessThan = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // expires in 5s

  return getSignedUrl({
    url,
    keyPairId,
    dateLessThan,
    privateKey,
  });
};

export const FREE_QUOTA_BYTES = 1 * 1024 ** 3;

const GB = 1024 ** 3;
const TB = 1024 ** 4;

export const PLANS = Object.fromEntries(
  [
    [process.env.RZP_PLAN_PRO_MONTHLY, { maxStorageQuotaInBytes: 200 * GB }],
    [process.env.RZP_PLAN_PRO_YEARLY, { maxStorageQuotaInBytes: 200 * GB }],
    [process.env.RZP_PLAN_PREMIUM_MONTHLY, { maxStorageQuotaInBytes: 2 * TB }],
    [process.env.RZP_PLAN_PREMIUM_YEARLY, { maxStorageQuotaInBytes: 2 * TB }],
  ].filter(([planId]) => Boolean(planId)),
);

export const isKnownPlan = (planId) =>
  typeof planId === "string" && Object.hasOwn(PLANS, planId);

export const getQuotaForPlan = (planId) =>
  PLANS[planId]?.maxStorageQuotaInBytes ?? FREE_QUOTA_BYTES;

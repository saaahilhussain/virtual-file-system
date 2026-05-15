export const FREE_QUOTA_BYTES = 1 * 1024 ** 3;

export const PLANS = {
  plan_ShjMpfAfF4O0rO: {
    maxStorageQuotaInBytes: 200 * 1024 ** 3, // 200 GB / Monthly
  },
  plan_Shj6gp1ZIwVX9R: {
    maxStorageQuotaInBytes: 200 * 1024 ** 3, // 200 GB / Yearly
  },
  plan_Shj6H9v3zxpCqu: {
    maxStorageQuotaInBytes: 2 * 1024 ** 4, // 2 TB / Monthly
  },
  plan_Shj5cTO35vELF8: {
    maxStorageQuotaInBytes: 2 * 1024 ** 4, // 2 TB / Yearly
  },
};

export const getQuotaForPlan = (planId) =>
  PLANS[planId]?.maxStorageQuotaInBytes ?? FREE_QUOTA_BYTES;

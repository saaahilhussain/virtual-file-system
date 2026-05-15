const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

/**
 * Utility: handle fetch errors
 */
async function handleFetchErrors(response) {
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errMsg = data.error;
    } catch (_) {
      // If JSON parsing fails, default errMsg stays
    }
    throw new Error(errMsg);
  }
  return response;
}

export const createSubscription = async (planId) => {
  const response = await fetch(`${BASE_URL}/subscriptions/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ planId }),
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

export const getMySubscription = async () => {
  const response = await fetch(`${BASE_URL}/subscriptions/my-plan`, {
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

export const upgradeSubscription = async (planId) => {
  const response = await fetch(`${BASE_URL}/subscriptions/upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ planId }),
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

export const pauseSubscription = async () => {
  const response = await fetch(`${BASE_URL}/subscriptions/pause`, {
    method: "POST",
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

export const resumeSubscription = async () => {
  const response = await fetch(`${BASE_URL}/subscriptions/resume`, {
    method: "POST",
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

export const cancelSubscription = async ({ cancelAtCycleEnd = true } = {}) => {
  const response = await fetch(`${BASE_URL}/subscriptions/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelAtCycleEnd }),
    credentials: "include",
  });

  await handleFetchErrors(response);
  return response.json();
};

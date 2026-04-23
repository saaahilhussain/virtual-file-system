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
  const data = await response.json();
  console.log(data);

  return data;
};

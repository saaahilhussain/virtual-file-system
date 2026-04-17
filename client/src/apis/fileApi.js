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

/**
 * Delete a file
 */
export async function deleteFile(id) {
  const response = await fetch(`${BASE_URL}/file/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  await handleFetchErrors(response);
  const data = await response.json();

  return data;
}

/**
 * Rename a file
 */
export async function renameFile(id, newFilename) {
  const response = await fetch(`${BASE_URL}/file/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newFilename }),
    credentials: "include",
  });

  await handleFetchErrors(response);
  const data = await response.json();

  return data;
}

/**
 * Get signed url from s3
 */

export async function uploadInitiate(file) {
  const response = await fetch(`${BASE_URL}/file/upload/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(file),
    credentials: "include",
  });

  await handleFetchErrors(response);
  const data = await response.json();

  const { uploadUrl } = data;
  return uploadUrl;
}

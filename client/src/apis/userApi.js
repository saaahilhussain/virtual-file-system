const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

/**
 * Fetch current logged-in user info
 */
export async function fetchUser() {
  const res = await fetch(`${BASE_URL}/user`, {
    credentials: "include",
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();
  return data;
}

/**
 * Fetch all users (admin only)
 */
export async function fetchAllUsers() {
  const res = await fetch(`${BASE_URL}/users`, {
    credentials: "include",
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (res.status === 403) {
    throw new Error("Forbidden");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await res.json();
  return data;
}

/**
 * Register a new user
 */
export async function registerUser(formData) {
  const res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to register");
  }

  return data;
}

/**
 * Login user
 */
export async function loginUser(formData) {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to login");
  }

  return data;
}

/**
 * Logout current user
 */
export async function logoutUser() {
  const res = await fetch(`${BASE_URL}/user/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to logout");
  }

  return data;
}

/**
 * Logout all sessions of current user
 */
export async function logoutAllSessions() {
  const res = await fetch(`${BASE_URL}/user/logout-all`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to logout from all sessions");
  }

  return data;
}

/**
 * Logout a specific user by ID (admin only)
 */
export async function logoutUserById(id) {
  const res = await fetch(`${BASE_URL}/users/${id}/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to logout user");
  }

  return data;
}

/**
 * Delete a user by ID (admin only)
 */
export async function deleteUserById(id) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete user");
  }

  return data;
}

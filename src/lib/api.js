const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const { token, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    typeof requestOptions.body !== "string"
  ) {
    headers.set("Content-Type", "application/json");
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
    });
  } catch (error) {
    throw new Error(
      "Could not reach the FriendsZone API. Check that the backend is running and VITE_API_URL is correct.",
      { cause: error }
    );
  }

  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return result;
}

export function apiAssetUrl(url) {
  if (!url || !url.startsWith("/uploads/")) return url;
  return `${API_BASE_URL.replace(/\/api$/, "")}${url}`;
}

export { API_BASE_URL };

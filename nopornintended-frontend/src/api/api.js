const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

// One helper that every call goes through
async function request(path, options = {}) {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      // only send a JSON content-type when there's actually a body
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      // response wasn't JSON, keep the default message
    }
    throw new Error(message);
  }

  return res.json();
}

// ---------- Videos ----------
export const getVideos = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/videos/${query ? `?${query}` : ""}`);
};

export const getVideo = (id) => request(`/videos/${id}/`);

export const getRelatedVideos = (id) => request(`/videos/${id}/related/`);

export const searchVideos = (term) =>
  request(`/videos/search/?q=${encodeURIComponent(term)}`);

export const trackView = (id) =>
  request(`/videos/${id}/view/`, { method: "POST" });

export const trackDownload = (id) =>
  request(`/videos/${id}/download/`, { method: "POST" });

// ---------- Categories ----------
export const getCategories = () => request("/categories/");

// ---------- Static pages ----------
export const getPage = (slug) => request(`/pages/${slug}/`);

// ---------- Forms ----------
export const sendContact = (data) =>
  request("/contact/", { method: "POST", body: JSON.stringify(data) });

export const sendReport = (data) =>
  request("/reports/", { method: "POST", body: JSON.stringify(data) });

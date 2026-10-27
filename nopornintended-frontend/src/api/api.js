const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const { body, headers, signal, ...rest } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  // Free hosting can need about a minute to wake after an idle period.
  const timeout = setTimeout(abort, 90000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      body,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(
        response.status === 404
          ? "This content is no longer available."
          : "We couldn't complete the request. Please try again.",
      );
      error.status = response.status;
      error.fields = data && typeof data === "object" ? data : {};
      throw error;
    }
    if (data === null && response.status !== 204)
      throw new Error(
        "The server returned an unexpected response. Please try again.",
      );
    return data;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error(
        "The server is taking too long to respond. Please try again.",
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
function collection(data) {
  if (Array.isArray(data))
    return { results: data, count: data.length, next: null, previous: null };
  if (Array.isArray(data?.results)) return data;
  throw new Error(
    "The server returned an unexpected response. Please try again.",
  );
}
const query = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  ).toString();
export const getVideos = (params = {}, options) =>
  request(`/videos/?${query(params)}`, options).then(collection);
export const getVideo = (id, options) =>
  request(`/videos/${encodeURIComponent(id)}/`, options);
export const getRelatedVideos = (id, params = {}, options) =>
  request(
    `/videos/${encodeURIComponent(id)}/related/?${query(params)}`,
    options,
  ).then(collection);
export const searchVideos = (term, params = {}, options) =>
  request(`/videos/search/?${query({ ...params, q: term })}`, options).then(
    collection,
  );
export const trackView = (id) =>
  request(`/videos/${encodeURIComponent(id)}/view/`, { method: "POST" });
export const trackDownload = (id, options) =>
  request(`/videos/${encodeURIComponent(id)}/download/`, {
    ...options,
    method: "POST",
  });
export const getCategories = (signal) =>
  request("/categories/", { signal })
    .then(collection)
    .then((data) => data.results);
export const getPage = (slug, options) =>
  request(`/pages/${encodeURIComponent(slug)}/`, options);
export const sendContact = (data) =>
  request("/contact/", { method: "POST", body: JSON.stringify(data) });
export const sendReport = (data) =>
  request("/reports/", { method: "POST", body: JSON.stringify(data) });
export const voteVideo = (id, data) =>
  request(`/videos/${encodeURIComponent(id)}/reaction/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const getComments = (id, page, options) =>
  request(
    `/videos/${encodeURIComponent(id)}/comments/?page=${page}`,
    options,
  ).then(collection);
export const sendComment = (id, data) =>
  request(`/videos/${encodeURIComponent(id)}/comments/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

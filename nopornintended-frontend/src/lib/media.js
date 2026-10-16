export function mediaUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function formatCount(value) {
  const count = Math.max(0, Number(value) || 0);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}
export function buildFileName(video) {
  let extension = "mp4";
  try {
    const candidate = new URL(video.path, window.location.origin).pathname
      .split(".")
      .pop();
    if (/^(mp4|webm|mov|m4v|ogv|mkv)$/i.test(candidate))
      extension = candidate.toLowerCase();
  } catch {
    /* Use the standard fallback extension. */
  }
  const base = (video.label || video.title || `video-${video.id}`)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${base || `video-${video.id}`}.${extension}`;
}

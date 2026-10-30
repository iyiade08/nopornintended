// Only embed providers we explicitly support; other URLs remain file sources.
const DOOD_HOSTS = new Set([
  "playmogo.com",
  "www.playmogo.com",
  "doodstream.com",
  "www.doodstream.com",
]);

export function hostedVideo(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/(?:e|d)\/([a-zA-Z0-9]+)\/?$/);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !DOOD_HOSTS.has(url.hostname) ||
      !match
    )
      return null;
    const id = match[1];
    return {
      provider: "DoodStream",
      embedUrl: `${url.origin}/e/${id}`,
      downloadUrl: `${url.origin}/d/${id}`,
    };
  } catch {
    return null;
  }
}

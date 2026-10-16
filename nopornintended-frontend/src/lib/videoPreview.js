const pending = [];
const MAX_ACTIVE_PREVIEWS = 3;
let active = 0;

function runNext() {
  while (active < MAX_ACTIVE_PREVIEWS && pending.length) {
    const job = pending.shift();
    if (job.signal.aborted) continue;
    active += 1;
    job.signal.removeEventListener("abort", job.cancel);
    Promise.resolve()
      .then(job.load)
      .then(job.resolve, job.reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  }
}

export function queuePreview(load, signal) {
  return new Promise((resolve, reject) => {
    const job = { load, signal, resolve, reject };
    job.cancel = () => {
      const index = pending.indexOf(job);
      if (index !== -1) pending.splice(index, 1);
      reject(new DOMException("Preview cancelled", "AbortError"));
    };
    if (signal.aborted) {
      job.cancel();
      return;
    }
    signal.addEventListener("abort", job.cancel, { once: true });
    pending.push(job);
    runNext();
  });
}

export function previewTime(duration) {
  return Number.isFinite(duration) && duration > 0
    ? Math.min(1.5, duration * 0.1)
    : 0;
}

// Display a decoded, paused frame directly. This works with cross-origin video
// without requiring canvas access or downloading the entire file as a blob.
export function loadPreviewFrame(video, source, signal, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Preview cancelled", "AbortError"));
      return;
    }
    let settled = false;
    let metadataLoaded = false;
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("loadeddata", onFrame);
      video.removeEventListener("seeked", onFrame);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      video.pause();
      video.preload = "none";
      if (error) {
        video.removeAttribute("src");
        video.load();
        reject(error);
      } else resolve();
    };
    const onFrame = () => {
      if (metadataLoaded && !video.seeking && video.readyState >= 2) finish();
    };
    const onMetadata = () => {
      metadataLoaded = true;
      const time = previewTime(video.duration);
      if (time > 0) {
        try {
          video.currentTime = time;
        } catch {
          onFrame();
        }
      } else onFrame();
    };
    const onError = () =>
      finish(new Error("This video cannot provide a preview."));
    const onAbort = () =>
      finish(new DOMException("Preview cancelled", "AbortError"));
    const timeout = setTimeout(
      () => finish(new Error("The video preview timed out.")),
      timeoutMs,
    );
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("loadeddata", onFrame);
    video.addEventListener("seeked", onFrame);
    video.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = source;
    video.load();
  });
}

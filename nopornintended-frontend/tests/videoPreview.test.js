import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadPreviewFrame,
  previewTime,
  queuePreview,
} from "../src/lib/videoPreview.js";

class SampleVideo extends EventTarget {
  duration = 60;
  readyState = 0;
  seeking = false;
  loads = 0;
  pauses = 0;
  plays = 0;
  time = 0;
  set currentTime(value) {
    this.time = value;
    this.seeking = true;
  }
  get currentTime() {
    return this.time;
  }
  load() {
    this.loads += 1;
  }
  pause() {
    this.pauses += 1;
  }
  play() {
    this.plays += 1;
  }
  removeAttribute(name) {
    if (name === "src") this.src = "";
  }
}
const frame = (video) => {
  video.readyState = 2;
  video.seeking = false;
  video.dispatchEvent(new Event("seeked"));
};

test("chooses a frame inside short clips and beyond the opening frame", () => {
  assert.equal(previewTime(60), 1.5);
  assert.equal(previewTime(5), 0.5);
  assert.ok(previewTime(0.1) > 0 && previewTime(0.1) < 0.1);
  assert.equal(previewTime(Infinity), 0);
  assert.equal(previewTime(NaN), 0);
});

test("waits for a decoded frame and never starts playback", async () => {
  const video = new SampleVideo();
  const controller = new AbortController();
  let ready = false;
  const pending = loadPreviewFrame(
    video,
    "https://media.example.test/sample.mp4",
    controller.signal,
  ).then(() => {
    ready = true;
  });
  assert.equal(video.preload, "metadata");
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  video.dispatchEvent(new Event("loadedmetadata"));
  assert.equal(video.currentTime, 1.5);
  video.dispatchEvent(new Event("loadeddata"));
  await Promise.resolve();
  assert.equal(ready, false);
  frame(video);
  await pending;
  assert.equal(video.plays, 0);
  assert.equal(video.pauses, 1);
  assert.equal(video.preload, "none");
  assert.equal(video.src, "https://media.example.test/sample.mp4");
});

test("uses the first decoded frame when duration is unknown", async () => {
  const video = new SampleVideo();
  video.duration = Infinity;
  const pending = loadPreviewFrame(
    video,
    "sample.mp4",
    new AbortController().signal,
  );
  video.dispatchEvent(new Event("loadedmetadata"));
  video.readyState = 2;
  video.dispatchEvent(new Event("loadeddata"));
  await pending;
  assert.equal(video.currentTime, 0);
  assert.equal(video.plays, 0);
});

test("broken media stops loading and permits a placeholder", async () => {
  const video = new SampleVideo();
  const pending = loadPreviewFrame(
    video,
    "broken.mp4",
    new AbortController().signal,
  );
  video.dispatchEvent(new Event("error"));
  await assert.rejects(pending, /cannot provide a preview/);
  assert.equal(video.src, "");
  assert.equal(video.preload, "none");
});

test("cancellation releases a request when a card is removed", async () => {
  const video = new SampleVideo();
  const controller = new AbortController();
  const pending = loadPreviewFrame(video, "sample.mp4", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(video.src, "");
});

test("already-cancelled previews do not fetch media", async () => {
  const video = new SampleVideo();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loadPreviewFrame(video, "sample.mp4", controller.signal),
    { name: "AbortError" },
  );
  assert.equal(video.loads, 0);
});

test("stalled media times out and stops the request", async () => {
  const video = new SampleVideo();
  await assert.rejects(
    loadPreviewFrame(video, "sample.mp4", new AbortController().signal, 5),
    /timed out/,
  );
  assert.equal(video.src, "");
});

test("limits simultaneous preview loads and cancels queued cards", async () => {
  const releases = [];
  let started = 0;
  const load = () => {
    started += 1;
    return new Promise((resolve) => releases.push(resolve));
  };
  const jobs = Array.from({ length: 3 }, () =>
    queuePreview(load, new AbortController().signal),
  );
  const controller = new AbortController();
  const fourth = queuePreview(load, controller.signal);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 3);
  controller.abort();
  await assert.rejects(fourth, { name: "AbortError" });
  releases.forEach((resolve) => resolve());
  await Promise.all(jobs);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 3);
});

test("failed previews release their queue slot", async () => {
  await assert.rejects(
    queuePreview(
      () => Promise.reject(new Error("Bad media")),
      new AbortController().signal,
    ),
    /Bad media/,
  );
  assert.equal(
    await queuePreview(
      () => Promise.resolve("next frame"),
      new AbortController().signal,
    ),
    "next frame",
  );
});

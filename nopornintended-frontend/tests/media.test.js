import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildFileName, formatCount, mediaUrl } from "../src/lib/media.js";

globalThis.window = { location: { origin: "https://example.test" } };
after(() => {
  delete globalThis.window;
});

test("media links reject executable URLs and resolve relative assets", () => {
  assert.equal(mediaUrl("javascript:alert(1)"), "");
  assert.equal(mediaUrl("data:text/html,test"), "");
  assert.equal(
    mediaUrl("/media/sample.mp4"),
    "https://example.test/media/sample.mp4",
  );
  assert.equal(mediaUrl(null), "");
});

test("download filenames are safe and keep the media extension", () => {
  assert.equal(
    buildFileName({
      id: 1,
      label: "A Reader's Film!",
      path: "https://example.test/sample.webm?token=hidden",
    }),
    "a-readers-film.webm",
  );
  assert.equal(
    buildFileName({
      id: 2,
      label: "???",
      path: "https://example.test/download",
    }),
    "video-2.mp4",
  );
});

test("view counts handle missing, singular and large values", () => {
  assert.equal(formatCount(undefined), "0");
  assert.equal(formatCount(-10), "0");
  assert.equal(formatCount(1), "1");
  assert.equal(formatCount(1200), "1.2K");
});

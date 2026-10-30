import assert from "node:assert/strict";
import { test } from "node:test";
import { hostedVideo } from "../src/lib/hostedVideo.js";

test("recognizes the supplied DoodStream embed and its download page", () => {
  assert.deepEqual(hostedVideo("https://playmogo.com/e/yanwrem8jj2b"), {
    provider: "DoodStream",
    embedUrl: "https://playmogo.com/e/yanwrem8jj2b",
    downloadUrl: "https://playmogo.com/d/yanwrem8jj2b",
  });
  assert.equal(
    hostedVideo("https://doodstream.com/d/abc123/?ignored=1#fragment").embedUrl,
    "https://doodstream.com/e/abc123",
  );
});

test("file sources and arbitrary websites never become trusted embeds", () => {
  for (const value of [
    null,
    "",
    "/media/video.mp4",
    "https://nopornintendedvideos.b-cdn.net/video.mp4",
    "https://example.com/e/abc123",
    "https://playmogo.com.evil.test/e/abc123",
    "https://playmogo.com@evil.test/e/abc123",
    "https://someone@playmogo.com/e/abc123",
    "https://playmogo.com:8443/e/abc123",
    "http://playmogo.com/e/abc123",
    "https://playmogo.com/settings",
    "https://playmogo.com/e/abc123/extra",
    "https://playmogo.com/e/abc%2F123",
    "javascript:alert(1)",
    '<iframe src="https://playmogo.com/e/abc123"></iframe>',
  ])
    assert.equal(hostedVideo(value), null, String(value));
});

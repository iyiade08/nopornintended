import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, mock, test } from "node:test";

const source = readFileSync(
  new URL("../src/api/api.js", import.meta.url),
  "utf8",
).replaceAll(
  "import.meta.env.VITE_API_BASE_URL",
  '"https://api.example.test/api/"',
);
const api = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
afterEach(() => {
  mock.restoreAll();
  mock.timers.reset();
});

test("accepts legacy arrays and paginated lists", async () => {
  const items = [{ id: 1, label: "Sample" }];
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(items)),
  );
  assert.deepEqual(await api.getVideos(), {
    results: items,
    count: 1,
    next: null,
    previous: null,
  });
  mock.restoreAll();
  const page = { results: items, count: 40, next: "page2", previous: null };
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(page)),
  );
  assert.deepEqual(await api.getVideos({ page: 1 }), page);
});

test("preserves server field validation without exposing raw server text", async () => {
  mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ email: ["Enter a valid email."] }), {
        status: 400,
      }),
  );
  await assert.rejects(
    api.sendContact({ email: "invalid" }),
    (error) =>
      error.status === 400 && error.fields.email[0] === "Enter a valid email.",
  );
});

test("rejects malformed collection responses", async () => {
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ wrong: true })),
  );
  await assert.rejects(api.getVideos(), /unexpected response/);
});

test("does not send JSON content type on a GET and encodes search input", async () => {
  let captured;
  mock.method(globalThis, "fetch", async (url, options) => {
    captured = { url, options };
    return new Response("[]");
  });
  await api.searchVideos("a & b", { category: "featured", page: 2 });
  const url = new URL(captured.url);
  assert.equal(url.searchParams.get("q"), "a & b");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(captured.options.headers["Content-Type"], undefined);
  assert.equal(url.pathname, "/api/videos/search/");
});

test("requests a specific page of same-person recommendations", async () => {
  let captured;
  const page = {
    results: [{ id: 9 }],
    count: 11,
    next: null,
    previous: "page1",
  };
  mock.method(globalThis, "fetch", async (url) => {
    captured = new URL(url);
    return new Response(JSON.stringify(page));
  });
  assert.deepEqual(
    await api.getRelatedVideos(7, { page: 2, page_size: 10 }),
    page,
  );
  assert.equal(captured.pathname, "/api/videos/7/related/");
  assert.equal(captured.searchParams.get("page"), "2");
  assert.equal(captured.searchParams.get("page_size"), "10");
});

test("sends reaction values as JSON", async () => {
  let captured;
  mock.method(globalThis, "fetch", async (url, options) => {
    captured = { url, options };
    return new Response('{"value":1,"likes_count":1,"dislikes_count":0}');
  });
  await api.voteVideo(7, { visitor_id: "visitor", value: 1 });
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(captured.options.body), {
    visitor_id: "visitor",
    value: 1,
  });
});

test("aborts an obsolete request when its caller leaves the page", async () => {
  const controller = new AbortController();
  mock.method(
    globalThis,
    "fetch",
    (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
  );
  const pending = api.getVideos({}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("lets a sleeping backend wake without failing at the old 20-second limit", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  mock.method(globalThis, "fetch", (url, { signal }) => {
    requestSignal = signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
      setTimeout(() => resolve(new Response("[]")), 60000);
    });
  });
  const pending = api.getVideos();
  mock.timers.tick(21000);
  assert.equal(requestSignal.aborted, false);
  mock.timers.tick(39000);
  assert.equal((await pending).count, 0);
  mock.timers.tick(90000);
  assert.equal(requestSignal.aborted, false);
});

test("ends a stalled request after 90 seconds without automatically repeating a submission", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
  );
  const pending = api.sendComment(7, {
    name: "Reader",
    body: "Sample comment",
  });
  mock.timers.tick(89999);
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal.aborted, false);
  mock.timers.tick(1);
  await assert.rejects(pending, /taking too long/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { pageWindow, VIDEO_PAGE_SIZE } from "../src/lib/pagination.js";

test("the configured twelve videos per page includes a partial final page", () => {
  assert.equal(VIDEO_PAGE_SIZE, 12);
  assert.equal(Math.ceil(29 / VIDEO_PAGE_SIZE), 3);
  assert.equal(Math.ceil(24 / VIDEO_PAGE_SIZE), 2);
});

test("short libraries show every numbered page", () => {
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(3, 3), [1, 2, 3]);
});

test("large libraries keep a bounded window around the current page", () => {
  assert.deepEqual(pageWindow(50, 100), [48, 49, 50, 51, 52]);
  assert.deepEqual(pageWindow(50, 100, 3), [49, 50, 51]);
});

test("page windows stay inside the first and last boundaries", () => {
  assert.deepEqual(pageWindow(1, 100), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(100, 100), [96, 97, 98, 99, 100]);
  assert.deepEqual(pageWindow(100, 100, 3), [98, 99, 100]);
});

test("empty results and a single page never create phantom pages", () => {
  assert.deepEqual(pageWindow(1, 0), []);
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(99, 3), [1, 2, 3]);
});

import { useSyncExternalStore } from "react";
const SAVED_KEY = "npi-saved-videos";
const VOTES_KEY = "npi-votes";
const listeners = new Set();
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function readSaved() {
  const data = read(SAVED_KEY, []);
  return Array.isArray(data)
    ? [...new Set(data.filter((id) => /^\d+$/.test(String(id))).map(String))]
    : [];
}
let saved = readSaved();
let votes = read(VOTES_KEY, {});
if (!votes || typeof votes !== "object" || Array.isArray(votes)) votes = {};
let feedback = {};
let visitorId;
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === SAVED_KEY || event.key === null) {
      saved = readSaved();
      emit();
    }
    if (event.key === VOTES_KEY || event.key === null) {
      votes = read(VOTES_KEY, {});
      feedback = {};
      emit();
    }
  });
export function useSavedVideos() {
  return useSyncExternalStore(subscribe, () => saved);
}
export function toggleSaved(id) {
  const key = String(id);
  if (!saved.includes(key) && saved.length >= 500)
    throw new Error(
      "Your collection has reached 500 videos. Remove a saved video before adding another.",
    );
  const next = saved.includes(key)
    ? saved.filter((item) => item !== key)
    : [...saved, key];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Your browser couldn't save this video. Please allow site storage and try again.",
    );
  }
  saved = next;
  emit();
}
export function useVideoFeedback(id) {
  return useSyncExternalStore(subscribe, () => feedback[String(id)] || null);
}
export function storedVote(id) {
  return [1, -1].includes(votes?.[id]) ? votes[id] : 0;
}
export function updateFeedback(id, result) {
  votes = { ...votes, [id]: result.value };
  feedback = { ...feedback, [id]: result };
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch {
    /* The server still retains this session's vote. */
  }
  emit();
}
export function getVisitorId() {
  if (visitorId) return visitorId;
  try {
    visitorId = localStorage.getItem("npi-visitor");
  } catch {
    /* Session-only identity when storage is blocked. */
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      visitorId || "",
    )
  ) {
    visitorId = crypto.randomUUID();
    try {
      localStorage.setItem("npi-visitor", visitorId);
    } catch {
      /* Keep it in memory. */
    }
  }
  return visitorId;
}

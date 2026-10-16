export const VIDEO_PAGE_SIZE = 12;

export function pageWindow(page, totalPages, visiblePages = 5) {
  if (!Number.isFinite(totalPages) || totalPages < 1) return [];
  const total = Math.floor(totalPages);
  const current = Math.min(total, Math.max(1, Math.floor(page) || 1));
  const length = Math.min(total, Math.max(1, Math.floor(visiblePages) || 1));
  const start = Math.max(
    1,
    Math.min(current - Math.floor(length / 2), total - length + 1),
  );
  return Array.from({ length }, (_, index) => start + index);
}

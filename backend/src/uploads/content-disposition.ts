// RFC 5987 `filename*=` — needed alongside the plain ASCII `filename` param
// because uploaded/generated names can contain Cyrillic (dancer names,
// routine names), which plain `filename="..."` can't carry.
// `inline` (not `attachment`) so banners still render in <img> and tracks
// still play in <audio> instead of forcing a download.
export function buildContentDisposition(fileName: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

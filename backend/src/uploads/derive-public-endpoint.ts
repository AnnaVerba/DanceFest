// OCP_PUBLIC_URL is documented (.env.example) as "<host>/<bucket>" — the
// browser-facing base other code appends an object key to directly. A
// presigning S3Client instead needs just the bare host, since it appends
// "/<bucket>/<key>" itself (forcePathStyle) — so this strips the bucket
// segment back off. Returns null when the URL doesn't end with the bucket,
// so the caller can fall back to the regular (non-public) endpoint.
export function derivePublicEndpoint(
  publicUrl: string,
  bucket: string,
): string | null {
  const suffix = `/${bucket}`;
  if (!publicUrl.endsWith(suffix)) return null;
  return publicUrl.slice(0, -suffix.length);
}

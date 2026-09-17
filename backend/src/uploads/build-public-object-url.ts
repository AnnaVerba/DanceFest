// Same rule UploadsService.upload used for banner images — reused here so
// track playback URLs are built the same way. Assumes the bucket/prefix is
// configured for public read on the storage side; this call only builds
// the string, it doesn't grant access.
//
// OCP_PUBLIC_URL is the preferred base (already carries the browser-facing
// host and bucket, see derivePublicEndpoint). When it isn't configured, the
// fallback derives from OCP_ENDPOINT instead of assuming AWS — OCP's object
// storage is S3-compatible but not AWS, so path-style (endpoint/bucket/key)
// is used, matching forcePathStyle in OcpS3ClientFactory.
export function buildPublicObjectUrl(
  key: string,
  bucket: string,
  publicBaseUrl: string | null,
  endpoint: string | null,
): string {
  const base = publicBaseUrl
    ? publicBaseUrl.replace(/\/$/, '')
    : `${(endpoint ?? '').replace(/\/$/, '')}/${bucket}`;
  return `${base}/${key}`;
}

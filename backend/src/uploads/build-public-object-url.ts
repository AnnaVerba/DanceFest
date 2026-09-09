// Same rule UploadsService.upload used for banner images — reused here so
// track playback URLs are built the same way. Assumes the bucket/prefix is
// configured for public read on the storage side; this call only builds
// the string, it doesn't grant access.
export function buildPublicObjectUrl(
  key: string,
  bucket: string,
  publicBaseUrl: string | null,
  region: string | null,
): string {
  return publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

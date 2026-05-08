import { del as deleteBlob } from "@vercel/blob";
import { unlink } from "fs/promises";
import { join, resolve, sep } from "path";

const localUploadPathPrefix = "/uploads/";
const vercelBlobHostname = "blob.vercel-storage.com";

export function getLocalCoverFilePath(coverUrl?: string | null) {
  if (!coverUrl) return null;
  if (!coverUrl.startsWith(localUploadPathPrefix)) return null;

  let pathname: string;
  try {
    pathname = new URL(coverUrl, "http://local").pathname;
  } catch {
    return null;
  }

  if (!pathname.startsWith(localUploadPathPrefix)) return null;

  const filename = decodeURIComponent(pathname.slice(localUploadPathPrefix.length));
  if (!filename || filename.includes("/") || filename.includes("\\")) return null;

  const uploadDir = resolve(process.cwd(), "public", "uploads");
  const filePath = resolve(join(uploadDir, filename));

  return filePath.startsWith(`${uploadDir}${sep}`) ? filePath : null;
}

export async function deleteLocalCoverFile(coverUrl?: string | null) {
  const filePath = getLocalCoverFilePath(coverUrl);
  if (!filePath) return false;

  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    console.warn("Failed to delete local cover file", error);
    return false;
  }
}

function getBlobCoverUrl(coverUrl?: string | null) {
  if (!coverUrl || !process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const url = new URL(coverUrl);
    if (
      url.hostname.endsWith(vercelBlobHostname) &&
      url.pathname.startsWith(localUploadPathPrefix)
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

async function deleteBlobCoverFile(coverUrl?: string | null) {
  const blobUrl = getBlobCoverUrl(coverUrl);
  if (!blobUrl) return false;

  try {
    await deleteBlob(blobUrl);
    return true;
  } catch (error) {
    console.warn("Failed to delete blob cover file", error);
    return false;
  }
}

export async function deleteStoredCoverFile(coverUrl?: string | null) {
  if (await deleteBlobCoverFile(coverUrl)) return true;

  return deleteLocalCoverFile(coverUrl);
}

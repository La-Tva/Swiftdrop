import { put, del } from "@vercel/blob";

/**
 * Upload a file buffer directly to Vercel Blob.
 * Returns the public URL.
 */
export async function uploadToBlob(
    key: string,
    body: Buffer | Blob | ArrayBuffer,
    contentType: string
): Promise<string> {
    const { url } = await put(key, body, {
        access: "public",
        contentType,
    });
    return url;
}

/**
 * Delete a file from Vercel Blob by its URL.
 */
export async function deleteFromBlob(url: string): Promise<void> {
    await del(url);
}

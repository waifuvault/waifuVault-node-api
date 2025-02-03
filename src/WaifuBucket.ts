import type { GenericSuccess, WaifuBucket } from "./typeings.js";
import { checkError, getUrl } from "./utils.js";

/**
 * create a new bucket, buckets are bound to your IP, so you may only have one bucket per IP
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
export async function createBucket(signal?: AbortSignal): Promise<WaifuBucket> {
    const response = await fetch(`${getUrl()}/bucket/create`, {
        method: "GET",
        signal,
    });
    await checkError(response);
    return response.json();
}

/**
 * Get a bucket and all the files it contains
 * @param {string} bucketToken
 * @param {AbortSignal} signal
 * @returns {Promise<WaifuBucket>}
 */
export async function getBucket(bucketToken: string, signal?: AbortSignal): Promise<WaifuBucket> {
    const response = await fetch(`${getUrl()}/bucket/get`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
            bucket_token: bucketToken,
        }),
    });
    await checkError(response);
    return response.json();
}

/**
 * Delete a bucket and all files it contains
 * @param {string} bucketToken
 * @param {AbortSignal} signal
 * @returns {Promise<true>}
 */
export async function deleteBucket(bucketToken: string, signal?: AbortSignal): Promise<GenericSuccess> {
    const deleteUrl = `${getUrl()}/bucket/${bucketToken}`;
    const response = await fetch(deleteUrl, {
        method: "DELETE",
        signal,
    });
    await checkError(response);
    await response.text();
    return {
        description: "deleted",
        success: true,
    };
}

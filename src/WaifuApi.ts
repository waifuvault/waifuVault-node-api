import type {
    FileUpload,
    GetFileInfoFilename,
    GetFileInfoToken,
    ModifyEntryPayload,
    UrlUpload,
    WaifuBucket,
    WaifuError,
    WaifuResponse,
    XOR,
} from "./typeings.js";
import fs from "node:fs/promises";
import path from "node:path";

const url = "https://waifuvault.moe";

/**
 * Upload a file to waifuvault given a file or a URL
 * @param {XOR<FileUpload, UrlUpload>} options
 * @param {AbortSignal} signal an abort signal to use in the request
 * @returns {Promise<WaifuResponse>}
 */
export async function uploadFile(options: XOR<FileUpload, UrlUpload>, signal?: AbortSignal): Promise<WaifuResponse> {
    async function createBlobFromFile(path: string): Promise<Blob> {
        const file = await fs.readFile(path);
        return new Blob([file]);
    }

    let body: FormData | URLSearchParams;
    if ("file" in options) {
        const formData = new FormData();
        const file = options.file;
        let blob: Blob;
        let fileName: string | undefined = options.filename;
        if (file instanceof Buffer) {
            blob = new Blob([file]);
        } else {
            blob = await createBlobFromFile(file!);
            if (!fileName) {
                fileName = path.basename(file!);
            }
        }
        formData.append("file", blob, fileName);
        if (options.password) {
            formData.set("password", options.password);
        }
        body = formData;
    } else {
        const encodedParams = new URLSearchParams();
        encodedParams.set("url", options.url);
        if (options.password) {
            encodedParams.set("password", options.password);
        }
        body = encodedParams;
    }

    const response = await fetch(
        getUrl(
            {
                expires: options.expires,
                hide_filename: options.hideFilename,
                one_time_download: options.oneTimeDownload,
            },
            options.bucketToken,
        ),
        {
            signal,
            method: "PUT",
            body,
        },
    );
    await checkError(response);
    return response.json();
}

/**
 * Get the info foe a file
 * @param {string} token
 * @param {B} formatted - if true then `retentionPeriod` will be a human-readable string of when the file expires. else it will be an epoch number
 * @param {AbortSignal} signal an abort signal to use in the request
 * @returns {Promise<B extends true ? WaifuResponse<string> : WaifuResponse<number>>}
 */
export async function fileInfo<B extends boolean = false>(
    token: string,
    formatted?: B,
    signal?: AbortSignal,
): Promise<B extends true ? WaifuResponse<string> : WaifuResponse<number>> {
    const url = getUrl({ formatted }, token);
    const response = await fetch(url, { signal });
    await checkError(response);
    return response.json();
}

/**
 * Delete a file given the token
 * @param {string} token the token of the file to delete
 * @param {AbortSignal} signal the abort signal to use in the request
 * @returns {Promise<true | never>}
 */
export async function deleteFile(token: string, signal?: AbortSignal): Promise<true | never> {
    const url = getUrl(undefined, token);
    const response = await fetch(url, {
        method: "DELETE",
        signal,
    });
    await checkError(response);

    // at this point, the response has to be `true`, so consume the response and throw it away
    await response.text();
    return true;
}

/**
 * Get a file from a given token or a unique identifier (epoch/file)
 * @param {XOR<GetFileInfoToken, GetFileInfoFilename>} opts
 * @param {AbortSignal} signal he abort signal to use in the request
 * @returns {Promise<Buffer>}
 */
export async function getFile(opts: XOR<GetFileInfoToken, GetFileInfoFilename>, signal?: AbortSignal): Promise<Buffer> {
    let fileUrl: string;
    if (opts.filename) {
        fileUrl = `${url}/f/${opts.filename}`;
    } else {
        const fileInfoResp = await fileInfo(opts.token!, undefined, signal);
        fileUrl = fileInfoResp.url;
    }
    const headers: Record<string, string> = {};
    if (opts.password) {
        headers["x-password"] = opts.password;
    }
    const response = await fetch(fileUrl, {
        headers,
        signal,
    });
    if (response.status === 403) {
        // consume the body, ignore it due to memory leak
        await response.text();
        throw new Error("Password is incorrect");
    }
    await checkError(response);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * create a new bucket, buckets are bound to your IP, so you may only have one bucket per IP
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
export async function createBucket(signal?: AbortSignal): Promise<WaifuBucket> {
    const response = await fetch(`${url}/rest/bucket/create`, {
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
    const response = await fetch(`${url}/rest/bucket/get`, {
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
export async function deleteBucket(bucketToken: string, signal?: AbortSignal): Promise<true> {
    const deleteUrl = `${url}/rest/bucket/${bucketToken}`;
    const response = await fetch(deleteUrl, {
        method: "DELETE",
        signal,
    });
    await checkError(response);
    await response.text();
    return true;
}

/**
 * modify an entry
 * @param {string} token
 * @param {ModifyEntryPayload} opts
 * @returns {Promise<WaifuResponse>}
 */
export async function modifyEntry(token: string, opts: ModifyEntryPayload): Promise<WaifuResponse> {
    const url = getUrl(undefined, token);
    const response = await fetch(url, {
        body: JSON.stringify(opts),
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
    });
    await checkError(response);
    return response.json();
}

async function checkError(response: Response): Promise<void> {
    if (!response.ok) {
        const err = await response.text();
        let errStr;
        try {
            const respErrorJson: WaifuError = JSON.parse(err);
            errStr = `Error ${respErrorJson.status} (${respErrorJson.name}): ${respErrorJson.message}`;
        } catch {
            errStr = err;
        }

        throw new Error(errStr, {
            cause: err,
        });
    }
}

function getUrl(queryParams?: Record<string, unknown>, path?: string): string {
    let baseRestUrl = `${url}/rest`;
    if (path) {
        baseRestUrl += `/${path}`;
    }
    if (!queryParams) {
        return baseRestUrl;
    }
    for (const key of Object.keys(queryParams)) {
        if (queryParams[key] === undefined) {
            delete queryParams[key];
        } else {
            queryParams[key] = queryParams[key]?.toString();
        }
    }
    const parsedParams = new URLSearchParams(queryParams as Record<string, string>);
    if (parsedParams) {
        return `${baseRestUrl}?${parsedParams}`;
    }
    return baseRestUrl;
}

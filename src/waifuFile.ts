import type {
    FileUpload,
    GenericSuccess,
    GetFileInfoFilename,
    GetFileInfoToken,
    ModifyEntryPayload,
    UrlUpload,
    WaifuFileWithAlbum,
    XOR,
} from "./typeings";
import fs from "node:fs/promises";
import path from "node:path";
import { checkError, getUrl, url } from "./utils.js";

/**
 * Upload a file to waifuvault given a file or a URL
 * @param {XOR<FileUpload, UrlUpload>} options
 * @param {AbortSignal} signal an abort signal to use in the request
 * @returns {Promise<WaifuFile>}
 */
export async function uploadFile(
    options: XOR<FileUpload, UrlUpload>,
    signal?: AbortSignal,
): Promise<WaifuFileWithAlbum> {
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
 * @returns {Promise<B extends true ? WaifuFile<string> : WaifuFile<number>>}
 */
export async function fileInfo<B extends boolean = false>(
    token: string,
    formatted?: B,
    signal?: AbortSignal,
): Promise<B extends true ? WaifuFileWithAlbum<string> : WaifuFileWithAlbum<number>> {
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
export async function deleteFile(token: string, signal?: AbortSignal): Promise<GenericSuccess> {
    const url = getUrl(undefined, token);
    const response = await fetch(url, {
        method: "DELETE",
        signal,
    });
    await checkError(response);

    // at this point, the response has to be `true`, so consume the response and throw it away
    await response.text();
    return {
        description: "deleted",
        success: true,
    };
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
 * modify an entry
 * @param {string} token
 * @param {ModifyEntryPayload} opts
 * @returns {Promise<WaifuFile>}
 */
export async function modifyEntry(token: string, opts: ModifyEntryPayload): Promise<WaifuFileWithAlbum> {
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

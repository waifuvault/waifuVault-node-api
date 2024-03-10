import type {
    FileUpload,
    GetFileInfoFilename,
    GetFileInfoToken,
    UrlUpload,
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
 * @returns {Promise<WaifuResponse>}
 */
export async function uploadFile(options: XOR<FileUpload, UrlUpload>): Promise<WaifuResponse> {
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
        body = formData;
    } else {
        const encodedParams = new URLSearchParams();
        encodedParams.set("url", options.url);
        body = encodedParams;
    }

    const response = await fetch(
        getUrl({
            expires: options.expires,
            hide_filename: options.hideFilename,
            password: options.password,
        }),
        {
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
 * @param {B} formatted - if true then `retentionPeriod` will be a human readable string of when the file expires. else it will be an epoch number
 * @returns {Promise<B extends true ? WaifuResponse<string> : WaifuResponse<number>>}
 */
export async function fileInfo<B extends boolean = true>(
    token: string,
    formatted?: B,
): Promise<B extends true ? WaifuResponse<string> : WaifuResponse<number>> {
    const url = getUrl({ formatted }, token);
    const response = await fetch(url);
    await checkError(response);
    return response.json();
}

export async function deleteFile(token: string): Promise<boolean> {
    const url = getUrl(undefined, token);
    const response = await fetch(url, {
        method: "DELETE",
    });
    await checkError(response);
    const responseText = await response.text();
    return responseText === "true";
}

export async function getFile(opts: XOR<GetFileInfoToken, GetFileInfoFilename>): Promise<Buffer> {
    let fileUrl: string;
    if (opts.filename) {
        fileUrl = `${url}/f/${opts.filename}`;
    } else {
        const fileInfoResp = await fileInfo(opts.token!);
        fileUrl = fileInfoResp.url;
    }
    const headers: Record<string, string> = {};
    if (opts.password) {
        headers["x-password"] = opts.password;
    }
    const response = await fetch(fileUrl, {
        headers,
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

function getUrl(obj?: Record<string, unknown>, path?: string): string {
    let baseRestUrl = `${url}/rest`;
    if (path) {
        baseRestUrl += `/${path}`;
    }
    if (!obj) {
        return baseRestUrl;
    }
    for (const key of Object.keys(obj)) {
        if (obj[key] === undefined) {
            delete obj[key];
        } else {
            obj[key] = obj[key]?.toString();
        }
    }
    const parsedParams = new URLSearchParams(obj as Record<string, string>);
    if (parsedParams) {
        return `${baseRestUrl}?${parsedParams}`;
    }
    return baseRestUrl;
}

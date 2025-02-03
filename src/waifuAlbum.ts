import type { GenericSuccess, WaifuAlbum, WaifuAlbumCreateBody } from "./typeings.js";
import { checkError, getUrl } from "./utils.js";

/**
 * Create an album with the given name
 * @param {WaifuAlbumCreateBody} body
 * @param signal
 * @returns {Promise<WaifuAlbum>}
 */
export async function createAlbum(body: WaifuAlbumCreateBody, signal?: AbortSignal): Promise<WaifuAlbum> {
    const response = await fetch(`${getUrl()}/album/${body.bucketToken}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
    });
    await checkError(response);
    return response.json();
}

/**
 * Associate files with an album, the album must exist, and the files must be in the same bucket as the album
 * @param {string} albumToken - the album to link to
 * @param {string[]} filesToAssociate - the file tokens to associate
 * @param signal
 * @returns {Promise<WaifuAlbum>}
 */
export async function associateFiles(
    albumToken: string,
    filesToAssociate: string[],
    signal?: AbortSignal,
): Promise<WaifuAlbum> {
    const response = await fetch(`${getUrl()}/album/${albumToken}/associate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            fileTokens: filesToAssociate,
        }),
        signal,
    });
    await checkError(response);
    return response.json();
}

/**
 * Remove files from the album
 * @param {string} albumToken - The album token to associate the file with
 * @param {string[]} filesToAssociate -The file tokens to remove from the album
 * @param signal
 * @returns {Promise<WaifuAlbum>}
 */
export async function disassociateFiles(
    albumToken: string,
    filesToAssociate: string[],
    signal?: AbortSignal,
): Promise<WaifuAlbum> {
    const response = await fetch(`${getUrl()}/album/${albumToken}/disassociate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            fileTokens: filesToAssociate,
        }),
        signal,
    });
    await checkError(response);
    return response.json();
}

/**
 * Get an album and all of its files
 * @param {string} albumToken - the album private token
 * @param signal
 * @returns {Promise<WaifuAlbum>}
 */
export async function getAlbum(albumToken: string, signal?: AbortSignal): Promise<WaifuAlbum> {
    const response = await fetch(`${getUrl()}/album/${albumToken}`, { signal });
    await checkError(response);
    return response.json();
}

/**
 * Deletes an album and optionally, deletes all associated files with the album
 * @param {string} albumToken - the album token
 * @param {boolean} deleteFiles - if true, this will physically delete the files from WaifuVault, if false, this will simply disassociate the files, keeping them in the bucket
 * @param signal
 * @returns {Promise<GenericSuccess>}
 */
export async function deleteAlbum(
    albumToken: string,
    deleteFiles = false,
    signal?: AbortSignal,
): Promise<GenericSuccess> {
    const response = await fetch(`${getUrl()}/album/${albumToken}?deleteFiles=${deleteFiles}`, {
        method: "DELETE",
        signal,
    });
    await checkError(response);
    return response.json();
}

/**
 * sharing an album makes it so others can see it in a read-only view
 * @param {string} albumToken - the private album token to share
 * @param {AbortSignal} signal
 * @returns {Promise<string>} - the public URL of the album
 */
export async function shareAlbum(albumToken: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`${getUrl()}/album/share/${albumToken}`, { signal });
    await checkError(response);
    const json: GenericSuccess = await response.json();
    return json.description;
}

/**
 * Revoking an album invalidates the URL used to view it and makes it private
 * @param {string} albumToken - the private album token to revoke
 * @param {AbortSignal} signal
 * @returns {Promise<GenericSuccess>}
 */
export async function revokeAlbum(albumToken: string, signal?: AbortSignal): Promise<GenericSuccess> {
    const response = await fetch(`${getUrl()}/album/revoke/${albumToken}`, { signal });
    await checkError(response);
    return response.json();
}

/**
 * Download an album or selected files from an album
 * @param {string} albumToken - the public OR private album token
 * @param {number[]} files - the files ID's you want to download, omit for the whole album
 * @param {AbortSignal} signal
 * @returns {Promise<Buffer>} - this buffer will be a ZIP file containing all the files
 */
export async function downloadAlbum(albumToken: string, files: number[] = [], signal?: AbortSignal): Promise<Buffer> {
    const response = await fetch(`${getUrl()}/album/download/${albumToken}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(files),
        signal,
    });
    await checkError(response);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

import type { WaifuError } from "./typeings";

export const url = "https://waifuvault.moe";

export async function checkError(response: Response): Promise<void> {
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

export function getUrl(queryParams?: Record<string, unknown>, path?: string): string {
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

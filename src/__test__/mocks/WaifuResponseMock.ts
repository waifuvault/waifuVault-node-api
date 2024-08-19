import type { WaifuBucket, WaifuError, WaifuResponse } from "../../typeings.js";

export const waifuResponseMock1: WaifuResponse = {
    url: "https://waifuvault.moe/f/1710111505084/08.png",
    token: "123-fake-street",
    options: {
        protected: false,
        oneTimeDownload: false,
        hideFilename: false,
    },
    retentionPeriod: 1234,
};

export const waifuResponseMock2: WaifuResponse<string> = {
    url: "https://waifuvault.moe/f/1710111505084/08.png",
    token: "123-fake-street",
    options: {
        protected: true,
        oneTimeDownload: false,
        hideFilename: false,
    },
    retentionPeriod: "1234",
};

export const waifuBucketMock1: WaifuBucket = {
    token: "123-fake-street-bucket",
    files: [waifuResponseMock1],
};

export const waifuError: WaifuError = {
    status: 400,
    message: "loser",
    name: "whore",
};

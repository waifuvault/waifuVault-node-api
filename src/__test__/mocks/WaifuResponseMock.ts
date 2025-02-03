import type {
    GenericSuccess,
    WaifuAlbum,
    WaifuBucket,
    WaifuError,
    WaifuFile,
    WaifuFileWithAlbum,
} from "../../typeings.js";

export const MockUUId1 = "8c3d4527-4cea-4cb8-8171-002b158693ab";
export const MockUUId2 = "3ed6dafa-b56a-4207-b004-852abb6fea11";
export const MockUUId3 = "c18ff3cb-442d-44e7-b5d1-c43a83b3a1a4";

export const waifuResponseMock1: WaifuFileWithAlbum = {
    url: "https://waifuvault.moe/f/1710111505084/08.png",
    token: "123-fake-street",
    options: {
        protected: false,
        oneTimeDownload: false,
        hideFilename: false,
    },
    retentionPeriod: 1234,
    bucket: "123-fake-street-bucket",
    id: 1,
    album: null,
    views: 0,
};

export const waifuResponseMock2: WaifuFileWithAlbum<string> = {
    url: "https://waifuvault.moe/f/1710111505084/08.png",
    token: "123-fake-street",
    options: {
        protected: true,
        oneTimeDownload: false,
        hideFilename: false,
    },
    retentionPeriod: "1234",
    bucket: null,
    id: 2,
    album: null,
    views: 0,
};

export const waifuBucketMock1: WaifuBucket = {
    token: "123-fake-street-bucket",
    files: [waifuResponseMock1],
    albums: [],
};

export const waifuError: WaifuError = {
    status: 400,
    message: "loser",
    name: "whore",
};

export const genericSuccessDeletedMock: GenericSuccess = {
    description: "deleted",
    success: true,
};

export const WaifuFileMock1: WaifuFile = {
    ...waifuResponseMock1,
};

export const waifuAlbumMock1: WaifuAlbum = {
    bucketToken: MockUUId1,
    dateCreated: 0,
    files: [WaifuFileMock1],
    name: "album1",
    publicToken: MockUUId3,
    token: MockUUId2,
};

export const waifuAlbumMock2: WaifuAlbum = {
    bucketToken: MockUUId1,
    dateCreated: 0,
    files: [],
    name: "album2",
    publicToken: MockUUId3,
    token: MockUUId2,
};

export const sharedFileMock1: GenericSuccess = {
    description: "sharedAlbum.foo",
    success: true,
};

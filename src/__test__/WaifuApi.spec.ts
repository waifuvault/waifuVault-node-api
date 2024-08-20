import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import Waifuvault, { type FileUpload, type UrlUpload } from "../index.js";
import { waifuBucketMock1, waifuError, waifuResponseMock1, waifuResponseMock2 } from "./mocks/WaifuResponseMock.js";
import type { ModifyEntryPayload } from "../typeings.js";

describe("test WaifuApi", () => {
    const baseUrl = "https://waifuvault.moe/rest";
    const baseUrlNoQuery = `${baseUrl}?`;
    let spy: Mock;

    function createFetchResponse(status: number, data: unknown): Partial<Response> {
        return {
            json: () => new Promise(resolve => resolve(data as Record<string, unknown>)),
            text: () => new Promise(resolve => resolve(JSON.stringify(data))),
            arrayBuffer: () => new Promise(resolve => resolve(Buffer.from(data as ArrayBuffer))),
            status,
            ok: status >= 200 && status <= 299,
        };
    }

    beforeEach(() => {
        spy = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function getBufferFormData(): [FormData, Buffer, string] {
        const buffer = Buffer.from("slut");
        const fileName = "aWhore.jpg";
        const formData = new FormData();
        formData.append("file", new Blob([buffer]), fileName);
        return [formData, buffer, fileName];
    }

    describe("uploadFile", () => {
        const [body, buffer, filename] = getBufferFormData();

        function getUrlFormData(url: string, password?: string): URLSearchParams {
            const encodedParams = new URLSearchParams();
            encodedParams.set("url", url);
            if (password) {
                encodedParams.set("password", password);
            }
            return encodedParams;
        }

        it("should upload a file as Buffer", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const toUpload: FileUpload = {
                file: buffer,
                filename: filename,
            };
            const res = await Waifuvault.uploadFile(toUpload);
            expect(res).toBe(waifuResponseMock1);
            expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                method: "PUT",
                body,
            });
        });
        it("should upload a file from a URL", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const toUpload: UrlUpload = {
                url: "https:example.com",
            };
            const res = await Waifuvault.uploadFile(toUpload);
            expect(res).toBe(waifuResponseMock1);
            expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                method: "PUT",
                body: getUrlFormData("https:example.com"),
            });
        });
        it("should upload a file with parameters", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock2) as Response);
            const toUpload: UrlUpload = {
                url: "https:example.com",
                password: "foo",
                hideFilename: true,
                expires: "2d",
            };
            const res = await Waifuvault.uploadFile(toUpload);
            expect(res).toBe(waifuResponseMock2);
            expect(spy).toHaveBeenCalledWith(
                `${baseUrl}?expires=${toUpload.expires}&hide_filename=${toUpload.hideFilename}`,
                {
                    method: "PUT",
                    body: getUrlFormData("https:example.com", toUpload.password),
                },
            );
        });
        it("should handle exception", async () => {
            spy.mockResolvedValue(createFetchResponse(400, waifuError) as Response);
            const toUpload: UrlUpload = {
                url: "https:example.com",
                password: "foo",
                hideFilename: true,
                expires: "2d",
            };

            await expect(Waifuvault.uploadFile(toUpload)).rejects.toThrowError(
                `Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`,
            );

            expect(spy).toHaveBeenCalledWith(
                `${baseUrl}?expires=${toUpload.expires}&hide_filename=${toUpload.hideFilename}`,
                {
                    method: "PUT",
                    body: getUrlFormData("https:example.com", toUpload.password),
                },
            );
        });
    });
    describe("fileInfo", () => {
        it("should get fileInfo from token", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1));
            const res = await Waifuvault.fileInfo(waifuResponseMock1.token);
            expect(res).toBe(waifuResponseMock1);
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}?`, {});
        });
        it("should handle error", async () => {
            spy.mockResolvedValue(createFetchResponse(400, waifuError));
            await expect(Waifuvault.fileInfo(waifuResponseMock1.token)).rejects.toThrowError(
                `Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`,
            );
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}?`, {});
        });
    });
    describe("deleteFile", () => {
        it("should delete a file given a token", async () => {
            spy.mockResolvedValueOnce(createFetchResponse(200, "true"));
            const res = await Waifuvault.deleteFile(waifuResponseMock1.token);
            expect(res).toBe(true);
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}`, {
                method: "DELETE",
            });
        });
        it("should handle error", async () => {
            spy.mockResolvedValue(createFetchResponse(400, waifuError));
            await expect(Waifuvault.deleteFile(waifuResponseMock1.token)).rejects.toThrowError(
                `Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`,
            );
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}`, {
                method: "DELETE",
            });
        });
    });
    describe("getFile", () => {
        it("should get a file from token", async () => {
            const [, buffer] = getBufferFormData();
            spy.mockResolvedValueOnce(createFetchResponse(200, waifuResponseMock1));
            spy.mockResolvedValueOnce(createFetchResponse(200, buffer));
            const res = await Waifuvault.getFile({
                token: waifuResponseMock1.token,
            });
            expect(res).toStrictEqual(buffer);

            expect(spy).toHaveBeenNthCalledWith(1, `${baseUrl}/${waifuResponseMock1.token}?`, {});
            expect(spy).toHaveBeenNthCalledWith(2, waifuResponseMock1.url, {
                headers: {},
            });
        });

        it("should get a file from URL", async () => {
            const [, buffer] = getBufferFormData();
            spy.mockResolvedValueOnce(createFetchResponse(200, buffer));
            const filename = "1710111505084/08.png";
            const res = await Waifuvault.getFile({
                filename,
            });
            expect(res).toStrictEqual(buffer);
            expect(spy).toHaveBeenCalledWith(waifuResponseMock1.url, {
                headers: {},
            });
        });
        it("should get a file with password header", async () => {
            const [, buffer] = getBufferFormData();
            spy.mockResolvedValueOnce(createFetchResponse(200, buffer));
            const filename = "1710111505084/08.png";
            const password = "whoreBag";
            const res = await Waifuvault.getFile({
                filename,
                password,
            });
            expect(res).toStrictEqual(buffer);
            expect(spy).toHaveBeenCalledWith(waifuResponseMock2.url, {
                headers: {
                    "x-password": password,
                },
            });
        });
        it("should handle error from invalid password", async () => {
            spy.mockResolvedValueOnce(createFetchResponse(403, "<div></div>"));
            const filename = "1710111505084/08.png";
            const password = "whoreBag2";
            await expect(
                Waifuvault.getFile({
                    filename,
                    password,
                }),
            ).rejects.toThrowError(`Password is incorrect`);
            expect(spy).toHaveBeenCalledWith(waifuResponseMock2.url, {
                headers: {
                    "x-password": password,
                },
            });
        });
        it("should handle waifuError", async () => {
            spy.mockResolvedValueOnce(createFetchResponse(400, waifuError));
            const filename = "1710111505084/08.png";
            const password = "whoreBag2";
            await expect(
                Waifuvault.getFile({
                    filename,
                    password,
                }),
            ).rejects.toThrowError(`Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`);
            expect(spy).toHaveBeenCalledWith(waifuResponseMock2.url, {
                headers: {
                    "x-password": password,
                },
            });
        });
    });
    describe("modifyEntry", () => {
        const modifyRequest: ModifyEntryPayload = {
            password: "foo",
            customExpiry: "2d",
        };

        it("should modify an entry given a token", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1));
            const res = await Waifuvault.modifyEntry(waifuResponseMock1.token, modifyRequest);
            expect(res).toBe(waifuResponseMock1);
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}`, {
                headers: {
                    "Content-Type": "application/json",
                },
                method: "PATCH",
                body: JSON.stringify(modifyRequest),
            });
        });
        it("should handle an error", async () => {
            spy.mockResolvedValue(createFetchResponse(400, waifuError));
            await expect(Waifuvault.modifyEntry(waifuResponseMock1.token, modifyRequest)).rejects.toThrowError(
                `Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`,
            );
            expect(spy).toHaveBeenCalledWith(`${baseUrl}/${waifuResponseMock1.token}`, {
                headers: {
                    "Content-Type": "application/json",
                },
                method: "PATCH",
                body: JSON.stringify(modifyRequest),
            });
        });
    });
    describe("buckets", () => {
        describe("create bucket", () => {
            it("should create a new bucket", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuBucketMock1) as Response);
                const res = await Waifuvault.createBucket();
                expect(res).toBe(waifuBucketMock1);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/bucket/create`, {
                    method: "GET",
                });
            });
        });
        describe("get bucket", () => {
            it("should get a bucket", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuBucketMock1) as Response);
                const res = await Waifuvault.getBucket(waifuBucketMock1.token);
                expect(res).toBe(waifuBucketMock1);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/bucket/get`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bucket_token: waifuBucketMock1.token,
                    }),
                    signal: undefined,
                });
            });
        });
        describe("delete bucket", () => {
            it("should delete a bucket", async () => {
                spy.mockResolvedValue(createFetchResponse(200, "true") as Response);
                const res = await Waifuvault.deleteBucket(waifuBucketMock1.token);
                expect(res).toBe(true);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/bucket/${waifuBucketMock1.token}`, {
                    method: "DELETE",
                });
            });
            it("should handle error", async () => {
                spy.mockResolvedValue(createFetchResponse(400, waifuError));
                await expect(Waifuvault.deleteBucket(waifuBucketMock1.token)).rejects.toThrowError(
                    `Error ${waifuError.status} (${waifuError.name}): ${waifuError.message}`,
                );
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/bucket/${waifuBucketMock1.token}`, {
                    method: "DELETE",
                });
            });
        });
    });
});

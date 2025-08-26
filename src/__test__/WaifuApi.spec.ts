import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import Waifuvault, { type FileUpload, type UrlUpload, type WaifuAlbumCreateBody } from "../index.js";
import {
    genericSuccessDeletedMock,
    sharedFileMock1,
    waifuAlbumMock1,
    waifuAlbumMock2,
    waifuBucketMock1,
    waifuError,
    waifuResponseMock1,
    waifuResponseMock2,
} from "./mocks/WaifuResponseMock.js";
import type { ModifyEntryPayload } from "../typeings.js";
import fs from "node:fs/promises";

describe("test WaifuApi", () => {
    const baseUrl = "https://waifuvault.moe/rest";
    const baseUrlNoQuery = `${baseUrl}?`;
    let spy: Mock;

    function createFetchResponse(status: number, data: unknown): Partial<Response> {
        return {
            json: () => new Promise(resolve => resolve(data as Record<string, unknown>)),
            text: () => new Promise(resolve => resolve(JSON.stringify(data))),
            arrayBuffer: () => new Promise(resolve => resolve(data as ArrayBuffer)),
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

    function getZipBufferFromData(): [number[], Buffer, string] {
        const buffer = Buffer.from("slut");
        const fileName = "aWhore.zip";
        return [[waifuResponseMock1.id], buffer, fileName];
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
                headers: {},
                signal: undefined,
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
                headers: {},
                signal: undefined,
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
                    headers: {},
                    signal: undefined,
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
                    headers: {},
                    signal: undefined,
                },
            );
        });
        it("should correctly handle Buffer to Blob conversion", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const testData = "TypeScript 5.9.2 Buffer test data";
            const buffer = Buffer.from(testData, "utf8");

            const toUpload: FileUpload = {
                file: buffer,
                filename: "typescript-test.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];

            expect(fetchOptions.body).toBeInstanceOf(FormData);
            expect(fetchOptions.method).toBe("PUT");
        });
        it("should handle Buffer without filename", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const buffer = Buffer.from("test without filename");

            const toUpload: FileUpload = {
                file: buffer,
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);
        });
        it("should handle different Buffer encodings", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const buffers = [
                Buffer.from("Hello World", "utf8"),
                Buffer.from("Hello World", "ascii"),
                Buffer.from([72, 101, 108, 108, 111]),
                Buffer.alloc(100, "a"),
            ];

            for (const buffer of buffers) {
                const toUpload: FileUpload = {
                    file: buffer,
                    filename: "test.txt",
                };

                await Waifuvault.uploadFile(toUpload);
            }

            expect(spy).toHaveBeenCalledTimes(buffers.length);
        });
        it("should handle empty Buffer", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const emptyBuffer = Buffer.alloc(0);

            const toUpload: FileUpload = {
                file: emptyBuffer,
                filename: "empty.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);
        });
        it("should handle large Buffer", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const largeBuffer = Buffer.alloc(1024 * 1024, "x"); // 1MB buffer

            const toUpload: FileUpload = {
                file: largeBuffer,
                filename: "large-file.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);
        });
        it("should handle Buffer with binary data", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
            const binaryBuffer = Buffer.from(binaryData);

            const toUpload: FileUpload = {
                file: binaryBuffer,
                filename: "test.png",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);
        });
        it("should use fallback filename when Buffer filename is undefined", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const buffer = Buffer.from("test data");

            const toUpload: FileUpload = {
                file: buffer,
                filename: undefined,
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
        });
        it("should handle Buffer with special characters", async () => {
            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
            const specialChars = "Hello 🌍 TypeScript 5.9.2! 特殊字符 émojis";
            const buffer = Buffer.from(specialChars, "utf8");

            const toUpload: FileUpload = {
                file: buffer,
                filename: "special-chars.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);
        });
        it("should handle string file path correctly", async () => {
            const mockFileData = Buffer.from("file content from disk");
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileData);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "/path/to/test-file.txt",
                filename: "custom-name.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("/path/to/test-file.txt");
            expect(spy).toHaveBeenCalledTimes(1);
            const [, fetchOptions] = spy.mock.calls[0];
            expect(fetchOptions.body).toBeInstanceOf(FormData);

            readFileSpy.mockRestore();
        });
        it("should extract filename from path when no filename provided", async () => {
            const mockFileData = Buffer.from("test file content");
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileData);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "/path/to/my-document.pdf",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("/path/to/my-document.pdf");
            expect(spy).toHaveBeenCalledTimes(1);

            readFileSpy.mockRestore();
        });
        it("should handle relative file paths", async () => {
            const mockFileData = Buffer.from("relative path content");
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileData);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "./files/document.docx",
                filename: "uploaded-doc.docx",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("./files/document.docx");
            expect(spy).toHaveBeenCalledTimes(1);

            readFileSpy.mockRestore();
        });
        it("should handle file path with special characters", async () => {
            const mockFileData = Buffer.from("special chars file");
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileData);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "/path with spaces/file-with-特殊字符.txt",
                filename: "special-file.txt",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("/path with spaces/file-with-特殊字符.txt");
            expect(spy).toHaveBeenCalledTimes(1);

            readFileSpy.mockRestore();
        });
        it("should extract correct filename from complex path", async () => {
            const mockFileData = Buffer.from("complex path test");
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileData);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "/very/deep/nested/path/final-file.jpg",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("/very/deep/nested/path/final-file.jpg");
            expect(spy).toHaveBeenCalledTimes(1);

            readFileSpy.mockRestore();
        });
        it("should handle file path that reads binary data", async () => {
            const mockBinaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
            const mockFileBuffer = Buffer.from(mockBinaryData);
            const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(mockFileBuffer);

            spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);

            const toUpload: FileUpload = {
                file: "/images/photo.png",
                filename: "uploaded-photo.png",
            };

            await Waifuvault.uploadFile(toUpload);

            expect(readFileSpy).toHaveBeenCalledWith("/images/photo.png");
            expect(spy).toHaveBeenCalledTimes(1);

            readFileSpy.mockRestore();
        });
        describe("upload headers", () => {
            describe("Ip address", () => {
                it("should upload file with client IP headers", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: FileUpload = {
                        file: buffer,
                        filename: filename,
                        clientIP: "192.168.1.100",
                    };
                    const res = await Waifuvault.uploadFile(toUpload);
                    expect(res).toBe(waifuResponseMock1);
                    expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                        method: "PUT",
                        body,
                        headers: {
                            "X-Forwarded-For": "192.168.1.100",
                            "X-Real-IP": "192.168.1.100",
                        },
                        signal: undefined,
                    });
                });
                it("should upload URL with client IP headers", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: UrlUpload = {
                        url: "https:example.com",
                        clientIP: "10.0.0.1",
                    };
                    const res = await Waifuvault.uploadFile(toUpload);
                    expect(res).toBe(waifuResponseMock1);
                    expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                        method: "PUT",
                        body: getUrlFormData("https:example.com"),
                        headers: {
                            "X-Forwarded-For": "10.0.0.1",
                            "X-Real-IP": "10.0.0.1",
                        },
                        signal: undefined,
                    });
                });
                it("should upload with IPv6 client IP", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: FileUpload = {
                        file: buffer,
                        filename: filename,
                        clientIP: "2001:db8::1",
                    };
                    await Waifuvault.uploadFile(toUpload);
                    expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                        method: "PUT",
                        body,
                        headers: {
                            "X-Forwarded-For": "2001:db8::1",
                            "X-Real-IP": "2001:db8::1",
                        },
                        signal: undefined,
                    });
                });
                it("should upload with client IP and other parameters", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock2) as Response);
                    const toUpload: UrlUpload = {
                        url: "https:example.com",
                        password: "secret",
                        expires: "1d",
                        hideFilename: true,
                        clientIP: "172.16.0.1",
                    };
                    await Waifuvault.uploadFile(toUpload);
                    expect(spy).toHaveBeenCalledWith(`${baseUrl}?expires=1d&hide_filename=true`, {
                        method: "PUT",
                        body: getUrlFormData("https:example.com", "secret"),
                        headers: {
                            "X-Forwarded-For": "172.16.0.1",
                            "X-Real-IP": "172.16.0.1",
                        },
                        signal: undefined,
                    });
                });
                it("should upload without IP headers when clientIP not provided", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: FileUpload = {
                        file: buffer,
                        filename: filename,
                    };
                    await Waifuvault.uploadFile(toUpload);
                    expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                        method: "PUT",
                        body,
                        headers: {},
                        signal: undefined,
                    });
                });
                it("should handle localhost IP address", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: FileUpload = {
                        file: buffer,
                        filename: filename,
                        clientIP: "127.0.0.1",
                    };
                    await Waifuvault.uploadFile(toUpload);
                    expect(spy).toHaveBeenCalledWith(baseUrlNoQuery, {
                        method: "PUT",
                        body,
                        headers: {
                            "X-Forwarded-For": "127.0.0.1",
                            "X-Real-IP": "127.0.0.1",
                        },
                        signal: undefined,
                    });
                });
                it("should handle client IP with bucket token", async () => {
                    spy.mockResolvedValue(createFetchResponse(200, waifuResponseMock1) as Response);
                    const toUpload: FileUpload = {
                        file: buffer,
                        filename: filename,
                        clientIP: "203.0.113.1",
                        bucketToken: "bucket123",
                    };
                    await Waifuvault.uploadFile(toUpload);
                    expect(spy).toHaveBeenCalledWith(`${baseUrl}/bucket123?`, {
                        method: "PUT",
                        body,
                        headers: {
                            "X-Forwarded-For": "203.0.113.1",
                            "X-Real-IP": "203.0.113.1",
                        },
                        signal: undefined,
                    });
                });
            });
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
            expect(res).toStrictEqual(genericSuccessDeletedMock);
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
                expect(res).toStrictEqual(genericSuccessDeletedMock);
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
    describe("albums", () => {
        describe("create album", () => {
            it("should create a new album in an existing bucket with files", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuAlbumMock1) as Response);
                const body: WaifuAlbumCreateBody = {
                    name: waifuAlbumMock1.name,
                    bucketToken: waifuBucketMock1.token,
                };
                const res = await Waifuvault.createAlbum(body);
                expect(res).toBe(waifuAlbumMock1);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuBucketMock1.token}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                    signal: undefined,
                });
            });
            it("should create a new album in an existing bucket", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuAlbumMock2) as Response);
                const body: WaifuAlbumCreateBody = {
                    name: waifuAlbumMock2.name,
                    bucketToken: waifuBucketMock1.token,
                };
                const res = await Waifuvault.createAlbum(body);
                expect(res).toBe(waifuAlbumMock2);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuBucketMock1.token}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                    signal: undefined,
                });
            });
        });
        describe("associations", () => {
            it("should associate a file to an album", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuAlbumMock1) as Response);
                const res = await Waifuvault.associateFiles(waifuAlbumMock1.token, [waifuResponseMock1.token]);
                expect(res).toBe(waifuAlbumMock1);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuAlbumMock1.token}/associate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        fileTokens: [waifuResponseMock1.token],
                    }),
                    signal: undefined,
                });
            });
            it("should disassociate a file from an album", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuAlbumMock2) as Response);
                const res = await Waifuvault.disassociateFiles(waifuAlbumMock2.token, [waifuResponseMock1.token]);
                expect(res).toBe(waifuAlbumMock2);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuAlbumMock2.token}/disassociate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        fileTokens: [waifuResponseMock1.token],
                    }),
                    signal: undefined,
                });
            });
        });
        describe("get album", () => {
            it("should get an album from a private token", async () => {
                spy.mockResolvedValue(createFetchResponse(200, waifuAlbumMock2) as Response);
                const res = await Waifuvault.getAlbum(waifuAlbumMock2.token);
                expect(res).toBe(waifuAlbumMock2);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuAlbumMock2.token}`, {
                    signal: undefined,
                });
            });
        });
        describe("delete album", () => {
            it("should delete an album from the private token", async () => {
                spy.mockResolvedValue(createFetchResponse(200, genericSuccessDeletedMock) as Response);
                const res = await Waifuvault.deleteAlbum(waifuAlbumMock2.token);
                expect(res).toStrictEqual(genericSuccessDeletedMock);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuAlbumMock2.token}?deleteFiles=false`, {
                    method: "DELETE",
                    signal: undefined,
                });
            });
            it("should delete an album from the private token delete files true", async () => {
                spy.mockResolvedValue(createFetchResponse(200, genericSuccessDeletedMock) as Response);
                const res = await Waifuvault.deleteAlbum(waifuAlbumMock2.token, true);
                expect(res).toStrictEqual(genericSuccessDeletedMock);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/${waifuAlbumMock2.token}?deleteFiles=true`, {
                    method: "DELETE",
                    signal: undefined,
                });
            });
        });
        describe("sharing albums", () => {
            it("should share an album", async () => {
                spy.mockResolvedValue(createFetchResponse(200, sharedFileMock1) as Response);
                const res = await Waifuvault.shareAlbum(waifuAlbumMock2.token);
                expect(res).toBe(sharedFileMock1.description); // ensure the response of the method returns the `description` key
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/share/${waifuAlbumMock2.token}`, {
                    signal: undefined,
                });
            });
            it("should revoke a shared album", async () => {
                spy.mockResolvedValue(createFetchResponse(200, sharedFileMock1) as Response);
                const res = await Waifuvault.revokeAlbum(waifuAlbumMock1.token);
                expect(res).toBe(sharedFileMock1);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/revoke/${waifuAlbumMock1.token}`, {
                    signal: undefined,
                });
            });
        });
        describe("download album", () => {
            it("should download a single file from an album", async () => {
                const [, buffer] = getZipBufferFromData();
                spy.mockResolvedValueOnce(createFetchResponse(200, buffer));
                const res = await Waifuvault.downloadAlbum(waifuAlbumMock1.token, [waifuResponseMock1.id]);
                expect(res).toStrictEqual(buffer);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/download/${waifuAlbumMock1.token}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify([waifuResponseMock1.id]),
                    signal: undefined,
                });
            });
            it("should download a whole album", async () => {
                const [, buffer] = getZipBufferFromData();
                spy.mockResolvedValueOnce(createFetchResponse(200, buffer));
                const res = await Waifuvault.downloadAlbum(waifuAlbumMock1.token);
                expect(res).toStrictEqual(buffer);
                expect(spy).toHaveBeenCalledWith(`${baseUrl}/album/download/${waifuAlbumMock1.token}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify([]),
                    signal: undefined,
                });
            });
        });
    });
});

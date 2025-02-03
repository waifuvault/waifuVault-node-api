# waifuvault-node-api

![tests](https://github.com/waifuvault/waifuVault-node-api/actions/workflows/main.yml/badge.svg)

This contains the official API bindings for uploading, deleting and obtaining files
with [waifuvault.moe](https://waifuvault.moe/). Contains a full up to date API for interacting with the service

## Installation

```sh
npm install waifuvault-node-api
```

## Usage

This API contains 4 interactions:

1. [Upload File](#upload-file)
2. [Get File Info](#get-file-info)
3. [Delete File](#delete-file)
4. [Get File](#get-file)
5. [Modify Entry](#modify-entry)
6. [Create Bucket](#create-bucket)
7. [Get Bucket](#get-bucket)
8. [Delete Bucket](#delete-bucket)
9. [Create Album](#create-album)
10. [Delete Album](#delete-album)
11. [Get Album](#get-album)
12. [Associate Files](#associate-files)
13. [Disassociate Files](#disassociate-files)
14. [Share Album](#share-album)
15. [Revoke Album](#revoke-album)
16. [Download Album](#download-album)

The package is namespaced to `Waifuvault`, so to import it, simply:

```ts
import Waifuvault from "waifuvault-node-api";
```

Each function takes a optional `signal` from an abort controller as the last argument,
you may use this to abort the requests

### Upload File<a id="upload-file"></a>

To Upload a file, use the `uploadFile` function. This function takes the following options as an object:

| Option            | Type                 | Description                                                                       | Required                            | Extra info                                    |
|-------------------|----------------------|-----------------------------------------------------------------------------------|-------------------------------------|-----------------------------------------------|
| `file`            | `string` or `Buffer` | The file to upload. can be a string to the file on disk or a Buffer               | true only if `url` is not supplied  | If `url` is supplied, this prop can't be set  |
| `url`             | `string`             | The URL to a file that exists on the internet                                     | true only if `file` is not supplied | If `file` is supplied, this prop can't be set |
| `expires`         | `string`             | A string containing a number and a unit (1d = 1day)                               | false                               | Valid units are `m`, `h` and `d`              |
| `hideFilename`    | `boolean`            | If true, then the uploaded filename won't appear in the URL                       | false                               | Defaults to `false`                           |
| `password`        | `string`             | If set, then the uploaded file will be encrypted                                  | false                               |                                               |
| `filename`        | `string`             | Only used if `file` is set and is a `Buffer`, will set the filename of the buffer | false                               |                                               |
| `oneTimeDownload` | `boolean`            | if supplied, the file will be deleted as soon as it is accessed                   | false                               |                                               |
| `bucketToken`     | `string`             | if supplied, the file will be associated with the bucket                          | false                               |                                               |

Using a URL:

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.uploadFile({
    url: "https://waifuvault.moe/assets/custom/images/08.png"
});
console.log(resp.url); // the file download URL
```

Using a Buffer:

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.uploadFile({
    file: Buffer.from("someData"),
    filename: "aCoolFile.jpg"
});
console.log(resp.url); // the file download URL
```

Using a file path:

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.uploadFile({
    file: "./files/aCoolFile.jpg"
});
console.log(resp.url); // the file download URL
```

### Get File Info<a id="get-file-info"></a>

If you have a token from your upload. Then you can get file info. This results in the following info:

* token
* url
* protected
* retentionPeriod

Use the `fileInfo` function. This function takes the following options as parameters:

| Option      | Type      | Description                                                        | Required | Extra info        |
|-------------|-----------|--------------------------------------------------------------------|----------|-------------------|
| `token`     | `string`  | The token of the upload                                            | true     |                   |
| `formatted` | `boolean` | If you want the `retentionPeriod` to be human-readable or an epoch | false    | defaults to false |

```ts
import Waifuvault from "waifuvault-node-api";

const info = await Waifuvault.fileInfo("someToken");
console.log(a.retentionPeriod); // 28407118974
console.log(a.url); // the file download URL
```

Human-readable timestamp:

```ts
import Waifuvault from "waifuvault-node-api";

const info = await Waifuvault.fileInfo("someToken", true);
console.log(a.retentionPeriod); // 328 days 18 hours 51 minutes 31 seconds
```

### Delete File<a id="delete-file"></a>

To delete a file, you must supply your token to the `deleteFile` function.

This function takes the following options as parameters:

| Option  | Type     | Description                              | Required | Extra info |
|---------|----------|------------------------------------------|----------|------------|
| `token` | `string` | The token of the file you wish to delete | true     |            |

> **NOTE:** `deleteFile` will only ever either return `true` or throw an exception if the token is invalid

```ts
import Waifuvault from "waifuvault-node-api";

const succsess = await Waifuvault.deleteFile("someToken");
console.log(succsess);
```

### Get File<a id="get-file"></a>

This lib also supports obtaining a file from the API as a Buffer by supplying either the token or the unique identifier
of the file (epoch/filename).

Use the `getFile` function. This function takes the following options an object:

| Option     | Type     | Description                                                                                      | Required                           | Extra info                                               |
|------------|----------|--------------------------------------------------------------------------------------------------|------------------------------------|----------------------------------------------------------|
| `token`    | `string` | The token of the file you want to download                                                       | true only if `filename` is not set | if `filename` is set, then this can not be used          |
| `filename` | `string` | The Unique identifier of the file, this is the epoch time stamp it was uploaded and the filename | true only if `token` is not set    | if `token` is set, then this can not be used             |
| `password` | `string` | The password for the file if it is protected                                                     | false                              | Must be supplied if the file is uploaded with `password` |

> **Important!** The Unique identifier filename is the epoch/filename only if the file uploaded did not have a hidden
> filename, if it did, then it's just the epoch.
> For example: `1710111505084/08.png` is the Unique identifier for a standard upload of a file called `08.png`, if this
> was uploaded with hidden filename, then it would be `1710111505084.png`

Obtain an encrypted file

```ts
import Waifuvault from "waifuvault-node-api";

// upload the file
const resp = await Waifuvault.uploadFile({
    url: "https://waifuvault.moe/assets/custom/images/08.png",
    password: "epic"
});

// download the file
const file = await Waifuvault.getFile({
    password: "epic",
    token: resp.token
});

console.log(file); // a Buffer
```

Obtain a file from Unique identifier

```ts
import Waifuvault from "waifuvault-node-api";

// download the file
const file = await Waifuvault.getFile({
    filename: "/1710111505084/08.png"
});

console.log(file); // a Buffer
```

### Modify Entry<a id="modify-entry"></a>

If you want to modify aspects of your entry such as password, removing password, decrypting the file, encrypting the
file, changing the expiry, etc. you can use `modifyEntry` function

Use the `modifyEntry` function. This function takes the following options an object and one as a parameter:

| parameter | Type     | Description                              | Required |
|-----------|----------|------------------------------------------|----------|
| `token`   | `string` | The token of the file you want to modify | true     |

Options:

| Option             | Type      | Description                                                                                              | Required                                                           | Extra info                                                                             |
|--------------------|-----------|----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| `password`         | `string`  | The new password or the password you want to use to encrypt the file                                     | false                                                              |                                                                                        |
| `previousPassword` | `string`  | If the file is currently protected or encrpyted and you want to change it, use this for the old password | true only if `password` is set and the file is currently protected | if the file is protected already and you want to change the password, this MUST be set |
| `customExpiry`     | `string`  | a new custom expiry, see `expires` in `uploadFile`                                                       | false                                                              |                                                                                        |
| `hideFilename`     | `boolean` | make the filename hidden                                                                                 | false                                                              | for the new URL, check the response URL prop                                           |

Set a password on a non-encrypted file:

```ts
import Waifuvault from "waifuvault-node-api";

const foo = await Waifuvault.modifyEntry("token", {
    password: "apple",
});
foo.protected; // true
```

Change a password:

```ts
import Waifuvault from "waifuvault-node-api";

const foo = await Waifuvault.modifyEntry("token", {
    password: "newPass",
    previousPassword: "apple",
});

foo.protected; // true
```

change expire:

```ts
import Waifuvault from "waifuvault-node-api";

await Waifuvault.modifyEntry("token", {
    customExpiry: "1d"
});
```

decrypt a file and remove the password:

```ts
import Waifuvault from "waifuvault-node-api";

const foo = await Waifuvault.modifyEntry("token", {
    password: "",
    previousPassword: "apple",
});

foo.protected; // false
```

### Create bucket<a id="create-bucket"></a>

Buckets are virtual collections that are linked to your IP and a token. When you create a bucket, you will receive a
bucket token that you can use in [Get Bucket](#get-bucket) to get all the files in that bucket

To create a bucket, use the `createBucket` function. This function does not take any arguments.

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.createBucket();
console.log(resp.token); // the token to the new bucket
```

### Get Bucket<a id="get-bucket"></a>

To get a bucket, you must use the `getBucket` function and supply the token.
This function takes the following options as parameters:

| Option  | Type     | Description             | Required | Extra info |
|---------|----------|-------------------------|----------|------------|
| `token` | `string` | The token of the bucket | true     |            |

This will respond with the bucket and all the files the bucket contains.

```ts
import Waifuvault from "waifuvault-node-api";

const bucket = await Waifuvault.getBucket("someToken");
console.log(bucket.token); //the token to the new bucket
console.log(bucket.files); // an array of files in this bucket
```

### Delete Bucket<a id="delete-bucket"></a>

Deleting a bucket will delete the bucket and all the files it contains.

To delete a bucket, you must call the `deleteBucket` function with the following options as parameters:

| Option  | Type     | Description                       | Required | Extra info |
|---------|----------|-----------------------------------|----------|------------|
| `token` | `string` | The token of the bucket to delete | true     |            |

> **NOTE:** `deleteBucket` will only ever either return `true` or throw an exception if the token is invalid

```ts
import Waifuvault from "waifuvault-node-api";

const respo = await Waifuvault.deleteBucket("someToken");
console.log(respo); // true
```

### Create Album<a id="create-album"></a>

Albums are shareable collections of files that exist within a bucket.

To create an album, you use the `createAlbum` function and supply a bucket token and name.

The function takes the following options as an object:

| Option        | Type     | Description                         | Required | Extra info |
|---------------|----------|-------------------------------------|----------|------------|
| `bucketToken` | `string` | The token of the bucket             | true     |            |
| `name`        | `string` | The name of the album to be created | true     |            |

This will respond with an album object containing the name and token of the album.

```ts
import Waifuvault from "waifuvault-node-api";

const album = await Waifuvault.createAlbum({
    name: "myNewAlbum",
    bucketToken: "someBucketToken"
});

console.log(album.token); // album token
console.log(album.name); // album name
console.log(album.files); // all files associated with the album
```

### Delete Album<a id="delete-album"></a>

To delete an album, you use the `deleteAlbum` function and supply the album token and a boolean indication of whether
the files contained in the album should be deleted or not.
If you choose false, the files will remain in the bucket.

The function takes the following parameters:

| Option        | Type      | Description                         | Required | Extra info          |
|---------------|-----------|-------------------------------------|----------|---------------------|
| `albumToken`  | `string`  | The private token of the album      | true     |                     |
| `deleteFiles` | `boolean` | Whether the files should be deleted | false    | defaults to `false` |

> **NOTE:** If `deleteFiles` is set to True, the files will be permanently deleted

this will return an object where the status is true if it was a success, or it will throw an error if it wasn't

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.deleteAlbum("albumToken");

console.log(resp.success); // true
```

delete files:

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.deleteAlbum("albumToken", true);

console.log(resp.success); // true
```

### Get Album<a id="get-album"></a>

To get the contents of an album, you use the `getAlbum` function and supply the album token.
The token must be the private token.

The function takes the following parameters:

| Option  | Type     | Description                    | Required | Extra info |
|---------|----------|--------------------------------|----------|------------|
| `token` | `string` | The private token of the album | true     |            |

This will respond with the album object containing the album information and files contained within the album.

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.getAlbum("SomeToken");

console.log(resp.token);
console.log(resp.bucketToken);
console.log(resp.publicToken);
console.log(resp.name);
console.log(resp.files);
```

### Associate File<a id="associate-files"></a>

To add files to an album, you use the `associateFiles` function and supply the private album token and a list of file
tokens.

The function takes the following parameters:

| Option             | Type       | Description                         | Required | Extra info |
|--------------------|------------|-------------------------------------|----------|------------|
| `albumToken`       | `string`   | The private token of the album      | true     |            |
| `filesToAssociate` | `string[]` | List of file tokens to add to album | true     |            |

This will respond with the new album object containing the added files.

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.associateFiles("someToken", ["someFileToken"]);

console.log(resp.token);
console.log(resp.bucketToken);
console.log(resp.publicToken);
console.log(resp.name);
console.log(resp.files); // will include the new file
```

### Disassociate File<a id="disassociate-files"></a>

To remove files from an album, you use the `disassociateFiles` function and supply the private album token and
a list of file tokens.

The function takes the following parameters:

| Option             | Type       | Description                                  | Required | Extra info |
|--------------------|------------|----------------------------------------------|----------|------------|
| `albumToken`       | `string`   | The private token of the album               | true     |            |
| `filesToAssociate` | `string[]` | List of file tokens to remove from the album | true     |            |

This will respond with the new album object with the files removed.

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.disassociateFiles("someToken", ["someFileToken"]);

console.log(resp.token);
console.log(resp.bucketToken);
console.log(resp.publicToken);
console.log(resp.name);
console.log(resp.files); // will not include the file
```

### Share Album<a id="share-album"></a>

To share an album, so it contents can be accessed from a public URL, you use the `shareAlbum` function and supply the
private token.

The function takes the following parameters:

| Option       | Type     | Description                    | Required | Extra info |
|--------------|----------|--------------------------------|----------|------------|
| `albumToken` | `string` | The private token of the album | true     |            |

This will respond with the public URL with which the album can be found.

```ts
import Waifuvault from "waifuvault-node-api";

const url = await Waifuvault.shareAlbum("privateAlbumToken");

console.log(url); // the url
```

> **NOTE:** The public album token can be found in the [Get Album](#get-album) results

### Revoke Album<a id="revoke-album"></a>

To revoke the sharing of an album, so it will no longer be accessible publicly, you use the `revokeAlbum` function
and supply the private token.

The function takes the following parameters:

| Option       | Type     | Description                    | Required | Extra info |
|--------------|----------|--------------------------------|----------|------------|
| `albumToken` | `string` | The private token of the album | true     |            |

this will return an object where the status is true if it was a success, or it will throw an error if it wasn't

```ts
import Waifuvault from "waifuvault-node-api";

const resp = await Waifuvault.revokeAlbum("somePrivateToken");

console.log(resp.success); // true
```

> **NOTE:** Once revoked, the URL for sharing is destroyed. If the album is later shared again, the URL issued will be
> different.

### Download Album<a id="download-album"></a>

To download the contents of an album as a zip file, you use the `downloadAlbum` function and supply a private or public
token for the album.

You can also supply the file ids as an array to selectively download files. these ids can be found as part of the
`WaifuFile` response.

The zip file will be returned as a buffer.

The function takes the following parameters:

| Option       | Type       | Description                              | Required | Extra info                                               |
|--------------|------------|------------------------------------------|----------|----------------------------------------------------------|
| `albumToken` | `string`   | The private or public token of the album | true     |                                                          |
| `files`      | `number[]` | The ids of the files to download         | false    | the ids can be found as part of the `WaifuFile` response |

download all files:

```ts
import Waifuvault from "waifuvault-node-api";

Waifuvault.downloadAlbum("someAlbumToken");
```

selective files:

```ts
import Waifuvault from "waifuvault-node-api";

Waifuvault.downloadAlbum("someAlbumToken", [1]);
```

get a file id from token:

```ts
import Waifuvault from "waifuvault-node-api";

const fileToken = "someToken";

// get file info
const fileInfo = await Waifuvault.fileInfo(fileToken);

// download the one file as zip

Waifuvault.downloadAlbum(fileInfo.album.token, [fileInfo.id]);
```

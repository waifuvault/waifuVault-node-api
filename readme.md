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

The package is namespaced to `Waifuvault`, so to import it, simply:

```ts
import Waifuvault from "waifuvault-node-api";
```

Each function takes a optional `signal` from an abort controller as the last argument,
you may use this to abort the requests

### Upload File<a id="upload-file"></a>

To Upload a file, use the `uploadFile` function. This function takes the following options as an object:

| Option         | Type                 | Description                                                                       | Required                            | Extra info                                    |
|----------------|----------------------|-----------------------------------------------------------------------------------|-------------------------------------|-----------------------------------------------|
| `file`         | `string` or `Buffer` | The file to upload. can be a string to the file on disk or a Buffer               | true only if `url` is not supplied  | If `url` is supplied, this prop can't be set  |
| `url`          | `string`             | The URL to a file that exists on the internet                                     | true only if `file` is not supplied | If `file` is supplied, this prop can't be set |
| `expires`      | `string`             | A string containing a number and a unit (1d = 1day)                               | false                               | Valid units are `m`, `h` and `d`              |
| `hideFilename` | `boolean`            | If true, then the uploaded filename won't appear in the URL                       | false                               | Defaults to `false`                           |
| `password`     | `string`             | If set, then the uploaded file will be encrypted                                  | false                               |                                               |
| `filename`     | `string`             | Only used if `file` is set and is a `Buffer`, will set the filename of the buffer | false                               |                                               |

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

Using a a file path:

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

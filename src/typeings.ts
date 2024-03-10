/**
 * options for uplading a file or URL
 */
type WaifuvaultPutOpts = {
    /**
     * a string containing a number and a letter of `m` for mins, `h` for hours, `d` for days.
     * For example: `1h` would be 1 hour and `1d` would be 1 day.
     * omit this if you want the file to exist according to the retention policy
     */
    expires?: string;

    /**
     * if set to true, then your filename will not appear in the URL. if false, then it will appear in the URL. defaults to false
     */
    hide_filename?: boolean;

    /**
     * Setting a password will encrypt the file
     */
    password?: string;
};

/**
 * Upload a file
 */
export type FileUpload = WaifuvaultPutOpts & {
    /**
     * The file buffer or a location to a file on disk
     */
    file: Buffer | string;

    /**
     * The filename of the upload, if you use a buffer, then this should be set
     */
    filename?: string;
};

/**
 * Upload a file via URL
 */
export type UrlUpload = WaifuvaultPutOpts & {
    /**
     * A url to the file you want uploaded
     */
    url: string;
};

/**
 * An error returned from the API
 */
export type WaifuError = {
    /**
     * The name of the HTTP status. e.g: Bad Request
     */
    name: string;

    /**
     * the message or reason why the request failed
     */
    message: string;

    /**
     * the http status returned
     */
    status: number;
};

/**
 * The response from the api for files and uploads
 */
export type WaifuResponse<T extends string | number = string> = {
    /**
     * The token for the uploaded file
     */
    token: string;

    /**
     * The URL to the uploaded file
     */
    url: string;

    /**
     * if this file is protected-protected/encrypted
     */
    protected: boolean;

    /**
     * a string or a number that represents when the file will expire, if called with `format` true, then this will be a string like "332 days 7 hours 18 minutes 8 seconds"
     */
    retentionPeriod: T;
};

type GetFileInfo = {
    /**
     * Password for this file
     */
    password?: string;
};

export type GetFileInfoToken = GetFileInfo & {
    /**
     * the file token
     */
    token: string;
};

export type GetFileInfoFilename = GetFileInfo & {
    /**
     * the filename and the file upload epoch. for example, 1710111505084/08.png.
     * files with hidden filenames will only contain the epoch with ext. for example, 1710111505084.png
     */
    filename: string;
};

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

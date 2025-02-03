import * as WaifuBucket from "./WaifuBucket.js";
import * as WaifuFile from "./waifuFile.js";
import * as WaifuAlbum from "./waifuAlbum.js";

const Waifuvault = {
    ...WaifuBucket,
    ...WaifuFile,
    ...WaifuAlbum,
};

export default Waifuvault;
export {
    WaifuError,
    FileUpload,
    UrlUpload,
    WaifuFile,
    WaifuAlbum,
    AlbumStub,
    WaifuFileWithAlbum,
    GenericSuccess,
    WaifuAlbumCreateBody,
} from "./typeings.js";

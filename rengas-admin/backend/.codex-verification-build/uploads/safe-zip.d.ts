export type SafeZipEntry = {
    fileName: string;
    data: Buffer;
};
export declare function readImageZip(buffer: Buffer): Promise<SafeZipEntry[]>;

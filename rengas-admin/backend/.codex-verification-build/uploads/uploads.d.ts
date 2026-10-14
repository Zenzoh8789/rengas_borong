export declare class UploadsController {
    upload(file?: Express.Multer.File): Promise<{
        imageUrl: string;
    }>;
}

import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { diskStorage } from "multer";
import { extname } from "path";

@Controller("uploads")
export class UploadsController {
  @Post("image")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (_request, file, callback) => {
          callback(
            null,
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(
          null,
          ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
        );
      },
    }),
  )
  upload(@UploadedFile() file: any, @Req() request: Request) {
    return {
      imageUrl: `${request.protocol}://${request.get("host")}/uploads/${file.filename}`,
    };
  }
}

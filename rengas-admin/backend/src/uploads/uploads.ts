import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

const uploadDirectory = join(process.cwd(), "uploads");

if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

@Controller("uploads")
export class UploadsController {
  @Post("image")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: uploadDirectory,

        filename: (_request, file, callback) => {
          const extension = extname(
            file.originalname,
          ).toLowerCase();

          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${extension}`;

          callback(null, uniqueName);
        },
      }),

      // No application-level file-size limit.

      fileFilter: (_request, file, callback) => {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              "Only JPG, PNG and WEBP images are allowed.",
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        "Please select a valid image.",
      );
    }

    return {
      imageUrl: `/uploads/${file.filename}`,
    };
  }
}
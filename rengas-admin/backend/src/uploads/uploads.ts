import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as sharpModule from "sharp";
import { getUploadDirectory } from "../storage";

const sharpFactory = ((sharpModule as any).default ?? sharpModule) as any;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

@Controller("uploads")
export class UploadsController {
  @Post("image")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: 8 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!allowedTypes.has(file.mimetype)) {
          return callback(
            new BadRequestException("Only JPG, PNG and WEBP images are allowed."),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Please select a valid image.");
    }

    const uploadDirectory = getUploadDirectory();
    await mkdir(uploadDirectory, { recursive: true });
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;

    try {
      const optimized = await sharpFactory(file.buffer, { failOn: "error" })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
        })
        .flatten({ background: "#FFFFFF" })
        .jpeg({ quality: 78, progressive: true, chromaSubsampling: "4:2:0" })
        .toBuffer();
      await writeFile(join(uploadDirectory, filename), optimized, { flag: "wx" });
    } catch {
      throw new BadRequestException("The selected file is not a readable image.");
    }

    return { imageUrl: `/uploads/${filename}` };
  }
}

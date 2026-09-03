import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DesignSetting,
  Notification,
  NotificationType,
  Product,
  Role,
} from "../entities";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import {
  MAX_SPREADSHEET_BYTES,
} from "../uploads/upload-validation";
import { readSpreadsheetRows } from "../uploads/spreadsheet";
import { UpdateDesignDto } from "./design.dto";

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(Notification)
    private notifications: Repository<Notification>,
    @InjectRepository(Product)
    private products: Repository<Product>,
    @InjectRepository(DesignSetting)
    private designs: Repository<DesignSetting>,
  ) {}

  listNotifications() {
    return this.notifications.find({
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  unreadCount() {
    return this.notifications
      .count({ where: { isRead: false } })
      .then((count) => ({ count }));
  }

  async readNotification(id: number) {
    await this.notifications.update(id, { isRead: true });
    return { success: true };
  }

  async readAll() {
    await this.notifications.update({ isRead: false }, { isRead: true });
    return { success: true };
  }

  async importPrices(file?: Express.Multer.File) {
    const rows = await readSpreadsheetRows(file);

    if (!rows.length) {
      throw new BadRequestException("The spreadsheet does not contain data.");
    }

    const headers = Object.keys(rows[0]);
    const codeHeader = headers.find(
      (header) => this.normalizeHeader(header) === "code",
    );
    const priceHeader = headers.find(
      (header) => this.normalizeHeader(header) === "price",
    );

    if (!codeHeader || !priceHeader) {
      throw new BadRequestException(
        'The spreadsheet must contain columns named "Code" and "Price".',
      );
    }

    // Last valid occurrence wins when a code appears more than once.
    const pricesByCode = new Map<string, number>();
    let invalid = 0;
    let duplicates = 0;

    for (const row of rows) {
      const code = this.normalizeCode(row[codeHeader]);
      const price = this.normalizePrice(row[priceHeader]);

      if (!code || price === null) {
        invalid += 1;
        continue;
      }

      if (pricesByCode.has(code)) duplicates += 1;
      pricesByCode.set(code, price);
    }

    if (!pricesByCode.size) {
      throw new BadRequestException(
        `No prices imported. ${rows.length} rows were skipped. Check the Code and Price columns.`,
      );
    }

    const requestedCodes = [...pricesByCode.keys()];
    const matchedProducts: Product[] = [];

    // Query in batches so large Excel uploads do not exceed SQL parameter limits.
    for (let index = 0; index < requestedCodes.length; index += 500) {
      const codes = requestedCodes.slice(index, index + 500);
      const matches = await this.products
        .createQueryBuilder("product")
        .where("UPPER(TRIM(product.code)) IN (:...codes)", { codes })
        .getMany();
      matchedProducts.push(...matches);
    }

    const matchedCodes = new Set<string>();
    for (const product of matchedProducts) {
      const code = this.normalizeCode(product.code);
      const price = pricesByCode.get(code);
      if (price === undefined) continue;

      product.price = price;
      matchedCodes.add(code);
    }

    if (matchedProducts.length) {
      await this.products.manager.transaction(async (manager) => {
        await manager.save(Product, matchedProducts, { chunk: 500 });
      });
    }

    const notFoundCodes = requestedCodes.filter(
      (code) => !matchedCodes.has(code),
    );
    const skipped = invalid + duplicates + notFoundCodes.length;

    await this.notifications.save(
      this.notifications.create({
        title: "Price import completed",
        message:
          `${matchedProducts.length} updated · ` +
          `${notFoundCodes.length} codes not found · ` +
          `${invalid} invalid rows`,
        type: NotificationType.SUCCESS,
      }),
    );

    return {
      total: rows.length,
      updated: matchedProducts.length,
      skipped,
      invalid,
      duplicates,
      missing: notFoundCodes.length,
      notFoundCodes: notFoundCodes.slice(0, 100),
    };
  }

  async getDesign() {
    let design = await this.designs.findOneBy({ id: 1 });
    if (!design) {
      design = await this.designs.save(this.designs.create({ id: 1 }));
    }
    return design;
  }

  async saveDesign(body: UpdateDesignDto) {
    await this.designs.upsert({ id: 1, ...body }, ["id"]);
    await this.notifications.save(
      this.notifications.create({
        title: "Design updated",
        message: "Catalogue design assets were saved",
        type: NotificationType.SUCCESS,
      }),
    );
    return this.getDesign();
  }

  private normalizeHeader(value: unknown) {
    return String(value ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  private normalizeCode(value: unknown) {
    return String(value ?? "")
      .trim()
      .toUpperCase();
  }

  private normalizePrice(value: unknown): number | null {
    const cleaned = String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(/^RM/i, "")
      .replace(/,/g, "");
    const price = Number(cleaned);

    return Number.isFinite(price) && price >= 0 ? price : null;
  }
}

@UseGuards(AdminAuthGuard)
@Controller()
export class FeaturesController {
  constructor(private service: FeaturesService) {}

  @Get("notifications")
  notifications() {
    return this.service.listNotifications();
  }

  @Get("notifications/unread-count")
  count() {
    return this.service.unreadCount();
  }

  @Patch("notifications/read-all")
  readAll() {
    return this.service.readAll();
  }

  @Patch("notifications/:id/read")
  read(@Param("id", ParseIntPipe) id: number) {
    return this.service.readNotification(id);
  }

  @Post("products/import-price")
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MAX_SPREADSHEET_BYTES,
      },
    }),
  )
  importPrice(@UploadedFile() file?: Express.Multer.File) {
    return this.service.importPrices(file);
  }

  @Get("design-settings")
  @Roles(Role.ADMIN)
  design() {
    return this.service.getDesign();
  }

  @Patch("design-settings")
  @Roles(Role.ADMIN)
  saveDesign(@Body() body: UpdateDesignDto) {
    return this.service.saveDesign(body);
  }
}

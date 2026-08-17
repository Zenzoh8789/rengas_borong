import { BadRequestException, Body, Controller, Injectable, Post, Res } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument = require("pdfkit");
import QRCode = require("qrcode");
import { In, Repository } from "typeorm";
import { Category, DesignSetting, Product } from "../entities";

type GenerateCatalogueDto = {
  title: string;
  from: string;
  to: string;
  categoryIds: number[];
};

const CATEGORY_COLORS = [
  "#00A878",
  "#17B7D1",
  "#FF8900",
  "#7C3AED",
  "#E11D48",
  "#2563EB",
  "#65A30D",
  "#DB2777",
  "#0F9D8A",
  "#EA580C",
  "#4F46E5",
  "#0891B2",
];
const CATALOGUE_URL = "https://www.rengatrading.com/catalogue";
const COMPANY_URL = "https://www.rengas.my";


@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(DesignSetting) private designs: Repository<DesignSetting>,
  ) {}

  async generate(input: GenerateCatalogueDto) {
    if (!input.title?.trim() || !input.from || !input.to) {
      throw new BadRequestException("Title, From date and To date are required");
    }
    if (!Array.isArray(input.categoryIds) || !input.categoryIds.length) {
      throw new BadRequestException("Select at least one category");
    }

    const categories = await this.categories.find({
      where: { id: In(input.categoryIds.map(Number)) },
      order: { name: "ASC" },
    });
    const products = await this.products.find({
      where: { category: { id: In(input.categoryIds.map(Number)) } },
      relations: { category: true },
      order: { description: "ASC" },
    });
    const design = await this.designs.findOneBy({ id: 1 });
    const logo = this.localAsset("../frontend/logo.png");
    // Use one logo source everywhere. The placeholder renderer applies its own
    // low opacity, so replacing frontend/logo.png also updates PDF watermarks.
    const grayscaleLogo = logo;
    const catalogueQr = await QRCode.toBuffer(COMPANY_URL, {
      type: "png",
      width: 320,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    const topBanner = await this.imageBuffer(design?.topBannerUrl);
    const stockImage = await this.imageBuffer(design?.productPhotoUrl);
    const productImages = new Map<number, Buffer | null>();
    // Keep memory and open-file usage predictable for large catalogues.
    for (let start = 0; start < products.length; start += 24) {
      const batch = products.slice(start, start + 24);
      const images = await Promise.all(
        batch.map((product) => this.imageBuffer(product.imageUrl)),
      );
      batch.forEach((product, index) => productImages.set(product.id, images[index]));
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: { Title: input.title, Author: "Renga Trading & Manufacturing" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    this.drawCover(doc, input, logo, topBanner, stockImage);

    let cataloguePage = 1;
    categories.forEach((category) => {
      const categoryProducts = products.filter(
        (product) => product.category?.id === category.id,
      );
      const color = this.categoryColor(category.name);

      for (let start = 0; start < Math.max(1, categoryProducts.length); start += 9) {
        doc.addPage();
        this.drawCategoryPage(
          doc,
          category.name,
          categoryProducts.slice(start, start + 9),
          productImages,
          color,
          cataloguePage,
          logo,
          grayscaleLogo,
        );
        cataloguePage += 1;
      }
    });

    this.drawContactPage(doc, logo, catalogueQr);

    doc.end();
    return finished;
  }

  private drawCover(
    doc: PDFKit.PDFDocument,
    input: GenerateCatalogueDto,
    logo: Buffer | null,
    topBanner: Buffer | null,
    stockImage: Buffer | null,
  ) {
    const width = doc.page.width;
    const height = doc.page.height;
    // Keep a clean white margin around all four sides of the cover.
    const coverInset = 22;
    const coverWidth = width - coverInset * 2;
    const middleTop = 472;

    // PDF page background / four-sided border area.
    doc.rect(0, 0, width, height).fill("#FFFFFF");

    if (topBanner) {
      // Lower the uploaded background strength so white cover text stays clear.
      doc.rect(coverInset, coverInset, coverWidth, middleTop - coverInset)
        .fill("#4C1D75");
      doc.save();
      try {
        doc.rect(
          coverInset,
          coverInset,
          coverWidth,
          middleTop - coverInset,
        )
          .clip()
          .opacity(0.58)
          .image(topBanner, coverInset, coverInset, {
            cover: [coverWidth, middleTop - coverInset],
            align: "center",
            valign: "center",
          });
      } catch {
        // A corrupt image must not abort the entire catalogue download.
      } finally {
        doc.restore();
      }
      doc.save()
        .opacity(0.18)
        .rect(coverInset, coverInset, coverWidth, middleTop - coverInset)
        .fill("#111827")
        .restore();
    } else {
      doc.save();
      const top = coverInset;
      const bottom = middleTop;
      doc.rect(coverInset, top, coverWidth, bottom - top).fill("#AA00D4");
      doc.polygon([coverInset, top], [width - coverInset, top], [coverInset, 238]).fill("#DFA7B2");
      doc.polygon([coverInset, 238], [275, 374], [coverInset, bottom]).fill("#17A9BE");
      doc.polygon([width - coverInset, top], [width - coverInset, bottom], [302, 236]).fill("#6D00D5");
      doc.polygon([coverInset, 238], [302, 236], [width - coverInset, bottom], [275, 374]).fill("#B500D5");
      doc.restore();
    }
    if (logo) doc.image(logo, width / 2 - 64, 62, { fit: [128, 128], align: "center", valign: "center" });

    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22)
      .text("RENGA TRADING &", 80, 242, { width: width - 160, align: "center" })
      .text("MANUFACTURING (M) SDN BHD.", 55, 280, { width: width - 110, align: "center" })
      .fontSize(21).text("PRICE LIST", 80, 333, { width: width - 160, align: "center" })
      .fontSize(15).text(input.title.trim(), 80, 376, { width: width - 160, align: "center" })
      .fontSize(11).text(`From: ${this.displayDate(input.from)}  To: ${this.displayDate(input.to)}`, 80, 414, {
        width: width - 160,
        align: "center",
      });

    if (stockImage) {
      // A tiny overlap prevents a rendering seam between the two images.
      const lowerTop = middleTop - 0.5;
      const lowerHeight = height - lowerTop - coverInset;
      doc.save();
      try {
        doc.rect(coverInset, lowerTop, coverWidth, lowerHeight)
          .clip()
          .image(stockImage, coverInset, lowerTop, {
            cover: [coverWidth, lowerHeight],
            align: "center",
            valign: "center",
          });
      } catch {
        // Keep generating the remaining pages when an upload is unreadable.
      } finally {
        doc.restore();
      }
    } else {
      doc.fillColor("#666666").fontSize(11).text(
        "Upload stock image in Design CMS",
        60,
        middleTop + 145,
        { width: width - 120, align: "center" },
      );
    }

    doc.rect(
      coverInset,
      coverInset,
      coverWidth,
      height - coverInset * 2,
    ).lineWidth(0.8).stroke("#475569");
  }

  private drawCategoryPage(
    doc: PDFKit.PDFDocument,
    categoryName: string,
    products: Product[],
    images: Map<number, Buffer | null>,
    color: string,
    pageNumber: number,
    logo: Buffer | null,
    grayscaleLogo: Buffer | null,
  ) {
    const width = doc.page.width;
    const height = doc.page.height;
    doc.rect(0, 0, width, height).fill(color);
    doc.rect(26, 28, width - 52, height - 56).fill("#FFFFFF");
    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(18)
      .text(categoryName, 70, 48, { width: width - 140, align: "center" });
    const titleWidth = Math.min(190, Math.max(85, categoryName.length * 10));
    doc.rect((width - titleWidth) / 2, 76, titleWidth, 3).fill(color);

    const cardWidth = 132;
    const cardHeight = 218;
    const gapX = 30;
    const gapY = 26;
    const startX = 70;
    const startY = 90;
    for (let slot = 0; slot < products.length; slot += 1) {
      const col = slot % 3;
      const row = Math.floor(slot / 3);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const product = products[slot];
      this.drawProductCard(
        doc,
        product,
        images.get(product.id) || null,
        grayscaleLogo,
        x,
        y,
        cardWidth,
        cardHeight,
        color,
      );
    }

    const footerTop = height - 34;
    doc.rect(0, footerTop, width, 34).fill(color);
    if (logo) {
      // The logo overlaps the white body and colored footer like the reference.
      doc.image(logo, 17, footerTop - 12, { fit: [30, 30] });
    }
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11)
      .text(String(pageNumber), width / 2 - 20, footerTop + 10, { width: 40, align: "center" });
    // Extend the rounded tab below the page so only its top and sides show.
    doc.save()
      .roundedRect(width - 130, footerTop - 13, 124, 52, 15)
      .fill(color)
      .restore();
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(15)
      .text("ORDER NOW", width - 124, footerTop - 5, { width: 112, align: "center" });
    doc.link(width - 130, footerTop - 13, 124, 47, CATALOGUE_URL);
  }

  private drawContactPage(
    doc: PDFKit.PDFDocument,
    logo: Buffer | null,
    qrCode: Buffer,
  ) {
    doc.addPage();
    const width = doc.page.width;
    const height = doc.page.height;
    const background = "#5B1875";

    // Use one full-page background color with a clean inset white border.
    doc.rect(0, 0, width, height).fill(background);
    doc.rect(20, 20, width - 40, height - 40)
      .lineWidth(1.2)
      .stroke("#FFFFFF");

    if (logo) {
      doc.image(logo, width / 2 - 58, 50, {
        fit: [116, 116],
        align: "center",
        valign: "center",
      });
    }
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(19)
      .text("RENGA TRADING &", 70, 168, { width: width - 140, align: "center" })
      .fontSize(17).text("MANUFACTURING (M) SDN BHD.", 45, 200, {
        width: width - 90,
        align: "center",
      });

    const cards = [
      {
        title: "HEAD OFFICE (JOHOR\nBAHRU)",
        address: "No. 12, Jalan Murni 3,\nTaman Perindustrian Murni,\n81400 Senai, Johor Darul Takzim,\nMalaysia.",
        contacts: ["+607 599 9994", "+607 599 9995", "+607 599 9521", "+6019 711 6465", "sales@rengas.my"],
      },
      {
        title: "KUALA LUMPUR BRANCH",
        address: "No. 10, Jalan SB Jaya 9,\nTaman Perindustrian SB Jaya,\n47000 Sungai Buloh, Selangor,\nMalaysia.",
        contacts: ["+603 6156 6466", "+603 6156 6466", "+6012 7697 621", "sales@rengas.my"],
      },
      {
        title: "PASAR RAYA RENGAS",
        address: "No. 7, 8, 9 & 10, Jalan Damai 2,\nTaman Damai, 81400 Senai,\nJohor Darul Takzim, Malaysia.",
        contacts: ["+607 598 7200", "+607 598 7200", "+6012 710 7621", "sales@rengas.my"],
      },
    ];
    const cardY = 245;
    const cardWidth = 167;
    const cardHeight = 270;
    const gap = 10;
    const startX = (width - (cardWidth * 3 + gap * 2)) / 2;
    cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      this.drawContactCard(doc, x, cardY, cardWidth, cardHeight, card);
    });

    doc.image(qrCode, width / 2 - 50, 560, { width: 100, height: 100 });
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(14)
      .text("www.rengas.my", width / 2 - 80, 670, { width: 160, align: "center" });

  }

  private drawContactCard(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    card: { title: string; address: string; contacts: string[] },
  ) {
    doc.save();
    doc.roundedRect(x + 3, y + 5, width, height, 12).fillOpacity(0.22).fill("#222222");
    doc.fillOpacity(1).roundedRect(x, y, width, height, 12)
      .lineWidth(1.3).fillAndStroke("#FFFFFF", "#E6B83F");
    doc.restore();

    doc.fillColor("#172033").font("Helvetica-Bold").fontSize(10)
      .text(card.title, x + 10, y + 15, { width: width - 20, height: 28, align: "center" });
    doc.moveTo(x + 22, y + 53).lineTo(x + width - 22, y + 53)
      .lineWidth(1.5).stroke("#F2B624");
    doc.fillColor("#172033").font("Helvetica").fontSize(8.5)
      .text(card.address, x + 14, y + 70, { width: width - 28, lineGap: 2 });

    const iconColors = ["#168CD2", "#168CD2", "#6C4AC7", "#10A76C", "#ED4A5A"];
    const iconLetters = ["T", "T", "F", "W", "E"];
    const contactStart = y + 145;
    card.contacts.forEach((contact, index) => {
      const rowY = contactStart + index * 24;
      doc.roundedRect(x + 15, rowY, 16, 16, 3).fill(iconColors[index]);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7)
        .text(iconLetters[index], x + 15, rowY + 5, { width: 16, align: "center" });
      doc.fillColor("#172033").font("Helvetica-Bold").fontSize(6.8)
        .text(contact, x + 39, rowY + 5, { width: width - 50 });
    });
  }

  private drawProductCard(
    doc: PDFKit.PDFDocument,
    product: Product,
    image: Buffer | null,
    logo: Buffer | null,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    doc.rect(x, y, width, height).lineWidth(0.8).stroke(color);
    const imageHeight = 116;
    if (image) {
      try {
        doc.image(image, x + 6, y + 5, { fit: [width - 12, imageHeight - 10], align: "center", valign: "center" });
      } catch {
        this.drawImagePlaceholder(doc, logo, x, y, width, imageHeight);
      }
    } else {
      this.drawImagePlaceholder(doc, logo, x, y, width, imageHeight);
    }
    doc.rect(x, y + imageHeight, width, 82).fill(color);

    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.5)
      .text(product.description.toUpperCase(), x + 7, y + imageHeight + 9, {
        width: width - 14,
        height: 34,
        align: "center",
        ellipsis: true,
      });
    doc.moveTo(x + 12, y + imageHeight + 53).lineTo(x + width - 12, y + imageHeight + 53)
      .lineWidth(1).stroke("#FFFFFF");
    doc.fontSize(9).text(product.code, x + 7, y + imageHeight + 62, {
      width: width - 14,
      align: "center",
    });
    doc.rect(x, y + height - 20, width, 20).fill("#FFFFFF");
    doc.fillColor(color).font("Helvetica-Bold").fontSize(8.5)
      .text(`UOM: ${product.uom}`, x + 7, y + height - 14, { width: width / 2 })
      .text(`RM ${Number(product.price).toFixed(2)}`, x + width / 2 - 3, y + height - 14, {
        width: width / 2 - 5,
        align: "right",
      });
  }

  private drawImagePlaceholder(
    doc: PDFKit.PDFDocument,
    logo: Buffer | null,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    doc.save();
    doc.rect(x + 1, y + 1, width - 2, height - 2).fill("#FAFAFA");
    if (logo) {
      // A low-opacity neutral watermark keeps missing-image products recognizable
      // without competing with real product photography.
      doc.opacity(0.1);
      doc.image(logo, x + 22, y + 18, {
        fit: [width - 44, height - 36],
        align: "center",
        valign: "center",
      });
    } else {
      doc.opacity(0.3).fillColor("#111111").font("Helvetica-Bold").fontSize(10)
        .text("RENGA", x + 5, y + height / 2 - 5, {
          width: width - 10,
          align: "center",
        });
    }
    doc.restore();
  }

  private displayDate(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  private categoryColor(categoryName: string) {
    // Stable pseudo-random color: categories look varied but keep the same
    // color every time the catalogue is regenerated.
    let hash = 0;
    for (const character of categoryName.toUpperCase()) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
  }

  private localAsset(relativePath: string) {
    const path = join(process.cwd(), relativePath);
    // PDFKit accepts PNG and JPEG only. Validate local assets as strictly as
    // uploaded/remote images so a renamed WebP/SVG cannot crash generation.
    return existsSync(path) ? this.pdfImage(readFileSync(path)) : null;
  }

  private async imageBuffer(url?: string | null): Promise<Buffer | null> {
    if (!url) return null;
    try {
      if (url.startsWith("/uploads/")) {
        const path = join(process.cwd(), url.replace(/^\/uploads\//, "uploads/"));
        return existsSync(path) ? this.pdfImage(readFileSync(path)) : null;
      }
      if (/^https?:\/\//i.test(url)) {
        const parsed = new URL(url);
        if (["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.pathname.startsWith("/uploads/")) {
          const path = join(process.cwd(), parsed.pathname.replace(/^\/uploads\//, "uploads/"));
          return existsSync(path) ? this.pdfImage(readFileSync(path)) : null;
        }
        const response = await fetch(url);
        if (!response.ok) return null;
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > 12 * 1024 * 1024) return null;
        return this.pdfImage(Buffer.from(await response.arrayBuffer()));
      }
    } catch {
      return null;
    }
    return null;
  }

  private pdfImage(buffer: Buffer): Buffer | null {
    if (buffer.length < 8 || buffer.length > 12 * 1024 * 1024) return null;
    const isPng = buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (isPng) return buffer;
    if (!isJpeg) return null;

    // Some image exporters add an empty APP1/Exif marker (FF E1 00 02).
    // Browsers accept it, but PDFKit's JPEG parser reads beyond the buffer and
    // throws "Attempt to access memory outside buffer bounds". Removing only
    // those empty markers preserves the JPEG pixels and makes it PDFKit-safe.
    return this.stripEmptyJpegApp1Segments(buffer);
  }

  private stripEmptyJpegApp1Segments(buffer: Buffer) {
    const parts: Buffer[] = [buffer.subarray(0, 2)];
    let offset = 2;

    while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
      const marker = buffer[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;

      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + length + 2 > buffer.length) return buffer;

      if (!(marker === 0xe1 && length === 2)) {
        parts.push(buffer.subarray(offset, offset + length + 2));
      }
      offset += length + 2;
    }

    parts.push(buffer.subarray(offset));
    return Buffer.concat(parts);
  }
}

@Controller("catalogues")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Post("generate")
  async generate(@Body() input: GenerateCatalogueDto, @Res() response: Response) {
    const pdf = await this.catalogue.generate(input);
    const safeTitle = input.title.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "catalogue";
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      "Content-Length": pdf.length,
    });
    response.end(pdf);
  }
}

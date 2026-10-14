"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueController = exports.CatalogueService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const sharpModule = require("sharp");
const typeorm_2 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const entities_1 = require("../entities");
const storage_1 = require("../storage");
const admin_auth_guard_1 = require("../auth/admin-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const entities_2 = require("../entities");
class GenerateCatalogueDto {
    title;
    from;
    to;
    categoryIds;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], GenerateCatalogueDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], GenerateCatalogueDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], GenerateCatalogueDto.prototype, "to", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(500),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], GenerateCatalogueDto.prototype, "categoryIds", void 0);
const sharpFactory = (sharpModule.default ??
    sharpModule);
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
let CatalogueService = class CatalogueService {
    products;
    categories;
    designs;
    imageCache = new Map();
    constructor(products, categories, designs) {
        this.products = products;
        this.categories = categories;
        this.designs = designs;
    }
    async generate(input, response) {
        if (!input.title?.trim() || !input.from || !input.to) {
            throw new common_1.BadRequestException("Title, From date and To date are required");
        }
        const categoryIds = Array.isArray(input.categoryIds)
            ? [...new Set(input.categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
            : [];
        if (!categoryIds.length) {
            throw new common_1.BadRequestException("Select at least one category");
        }
        const categories = await this.categories.find({
            where: { id: (0, typeorm_2.In)(categoryIds) },
            order: { name: "ASC" },
        });
        const enabledProductsWhere = {
            category: { id: (0, typeorm_2.In)(categoryIds) },
            catalogueEnabled: true,
        };
        const selectedProducts = await this.products.find({
            where: enabledProductsWhere,
            relations: { category: true },
            order: { category: { name: "ASC" }, description: "ASC", id: "ASC" },
        });
        if (!selectedProducts.length) {
            throw new common_1.BadRequestException("No enabled products are available for the selected categories");
        }
        const productsByCategory = new Map();
        for (const product of selectedProducts) {
            const categoryId = product.category.id;
            const group = productsByCategory.get(categoryId) || [];
            group.push(product);
            productsByCategory.set(categoryId, group);
        }
        const design = await this.designs.findOneBy({ id: 1 });
        const logo = this.localAsset("dist/public/logo.png") ||
            this.localAsset("public/logo.png") ||
            this.localAsset("frontend/logo.png") ||
            this.localAsset("../frontend/logo.png");
        const grayscaleLogo = this.localAsset("dist/assets/default-product-logo-grayscale.png") ||
            this.localAsset("assets/default-product-logo-grayscale.png") ||
            this.localAsset("backend/assets/default-product-logo-grayscale.png") ||
            logo;
        const catalogueQr = await QRCode.toBuffer(COMPANY_URL, {
            type: "png",
            width: 240,
            margin: 1,
            color: { dark: "#000000", light: "#FFFFFF" },
        });
        const [topBanner, stockImage] = await Promise.all([
            this.imageBuffer(design?.topBannerUrl, 1200, 900, 68),
            this.imageBuffer(design?.productPhotoUrl, 1200, 900, 68),
        ]);
        const safeTitle = input.title.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "catalogue";
        response.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
            "Cache-Control": "no-store",
        });
        const doc = new PDFDocument({
            size: "A4",
            margin: 0,
            bufferPages: false,
            compress: true,
            info: { Title: input.title.trim(), Author: "Renga Trading" },
        });
        const finished = new Promise((resolve, reject) => {
            response.once("finish", resolve);
            response.once("error", reject);
            doc.once("error", reject);
        });
        doc.pipe(response);
        this.drawCover(doc, input, logo, topBanner, stockImage);
        let cataloguePage = 1;
        for (const category of categories) {
            const products = productsByCategory.get(category.id) || [];
            for (let offset = 0; offset < products.length; offset += 9) {
                const categoryProducts = products.slice(offset, offset + 9);
                const imageResults = await Promise.all(categoryProducts.map(async (product) => ({
                    id: product.id,
                    image: await this.imageBuffer(product.imageUrl, 240, 210, 45),
                })));
                const productImages = new Map(imageResults.map(({ id, image }) => [id, image]));
                doc.addPage();
                this.drawCategoryPage(doc, category.name, categoryProducts, productImages, this.categoryColor(category.name), cataloguePage, logo, grayscaleLogo);
                cataloguePage += 1;
            }
        }
        this.drawContactPage(doc, logo, catalogueQr);
        doc.end();
        await finished;
    }
    drawCover(doc, input, logo, topBanner, stockImage) {
        const width = doc.page.width;
        const height = doc.page.height;
        const coverInset = 22;
        const coverWidth = width - coverInset * 2;
        const middleTop = 472;
        doc.rect(0, 0, width, height).fill("#FFFFFF");
        if (topBanner) {
            doc
                .rect(coverInset, coverInset, coverWidth, middleTop - coverInset)
                .fill("#4C1D75");
            doc.save();
            try {
                doc
                    .rect(coverInset, coverInset, coverWidth, middleTop - coverInset)
                    .clip()
                    .opacity(0.58)
                    .image(topBanner, coverInset, coverInset, {
                    cover: [coverWidth, middleTop - coverInset],
                    align: "center",
                    valign: "center",
                });
            }
            catch {
            }
            finally {
                doc.restore();
            }
            doc
                .save()
                .opacity(0.18)
                .rect(coverInset, coverInset, coverWidth, middleTop - coverInset)
                .fill("#111827")
                .restore();
        }
        else {
            doc.save();
            const top = coverInset;
            const bottom = middleTop;
            doc.rect(coverInset, top, coverWidth, bottom - top).fill("#AA00D4");
            doc
                .polygon([coverInset, top], [width - coverInset, top], [coverInset, 238])
                .fill("#DFA7B2");
            doc
                .polygon([coverInset, 238], [275, 374], [coverInset, bottom])
                .fill("#17A9BE");
            doc
                .polygon([width - coverInset, top], [width - coverInset, bottom], [302, 236])
                .fill("#6D00D5");
            doc
                .polygon([coverInset, 238], [302, 236], [width - coverInset, bottom], [275, 374])
                .fill("#B500D5");
            doc.restore();
        }
        if (logo)
            doc.image(logo, width / 2 - 64, 62, {
                fit: [128, 128],
                align: "center",
                valign: "center",
            });
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(24)
            .text("RENGA TRADING", 80, 260, {
            width: width - 160,
            align: "center",
        })
            .fontSize(21)
            .text("PRICE LIST", 80, 333, { width: width - 160, align: "center" })
            .fontSize(15)
            .text(input.title.trim(), 80, 376, {
            width: width - 160,
            align: "center",
        })
            .fontSize(11)
            .text(`From: ${this.displayDate(input.from)}  To: ${this.displayDate(input.to)}`, 80, 414, {
            width: width - 160,
            align: "center",
        });
        if (stockImage) {
            const lowerTop = middleTop - 0.5;
            const lowerHeight = height - lowerTop - coverInset;
            doc.save();
            try {
                doc
                    .rect(coverInset, lowerTop, coverWidth, lowerHeight)
                    .clip()
                    .image(stockImage, coverInset, lowerTop, {
                    cover: [coverWidth, lowerHeight],
                    align: "center",
                    valign: "center",
                });
            }
            catch {
            }
            finally {
                doc.restore();
            }
        }
        else {
            doc
                .fillColor("#666666")
                .fontSize(11)
                .text("Upload stock image in Design CMS", 60, middleTop + 145, {
                width: width - 120,
                align: "center",
            });
        }
        doc
            .rect(coverInset, coverInset, coverWidth, height - coverInset * 2)
            .lineWidth(0.8)
            .stroke("#475569");
    }
    drawCategoryPage(doc, categoryName, products, images, color, pageNumber, logo, grayscaleLogo) {
        const width = doc.page.width;
        const height = doc.page.height;
        doc.rect(0, 0, width, height).fill(color);
        doc.rect(26, 28, width - 52, height - 56).fill("#FFFFFF");
        doc
            .fillColor("#111111")
            .font("Helvetica-Bold")
            .fontSize(18)
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
            this.drawProductCard(doc, product, images.get(product.id) || null, grayscaleLogo, x, y, cardWidth, cardHeight, color);
        }
        const footerHeight = 34;
        const footerTop = height - footerHeight;
        doc.rect(0, footerTop, width, footerHeight).fill(color);
        if (logo) {
            doc.image(logo, 17, footerTop - 12, { fit: [30, 30] });
        }
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(String(pageNumber), width / 2 - 20, footerTop + 10, {
            width: 40,
            align: "center",
        });
        const orderWidth = 124;
        const orderHeight = 47;
        const orderX = width - orderWidth - 6;
        const orderY = height - orderHeight;
        doc.save();
        doc.roundedRect(orderX, orderY, orderWidth, orderHeight, 15).fill(color);
        doc.restore();
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(15)
            .text("ORDER NOW", orderX + 6, orderY + 8, {
            width: orderWidth - 12,
            align: "center",
        });
        doc.link(orderX, orderY, orderWidth, orderHeight, CATALOGUE_URL);
    }
    drawContactPage(doc, logo, qrCode) {
        doc.addPage();
        const width = doc.page.width;
        const height = doc.page.height;
        const background = "#5B1875";
        doc.rect(0, 0, width, height).fill(background);
        doc
            .rect(20, 20, width - 40, height - 40)
            .lineWidth(1.2)
            .stroke("#FFFFFF");
        if (logo) {
            doc.image(logo, width / 2 - 58, 50, {
                fit: [116, 116],
                align: "center",
                valign: "center",
            });
        }
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(21)
            .text("RENGA TRADING", 70, 184, {
            width: width - 140,
            align: "center",
        });
        const cards = [
            {
                title: "HEAD OFFICE (JOHOR\nBAHRU)",
                address: "No. 12, Jalan Murni 3,\nTaman Perindustrian Murni,\n81400 Senai, Johor Darul Takzim,\nMalaysia.",
                contacts: [
                    "+607 599 9994",
                    "+607 599 9995",
                    "+607 599 9521",
                    "+6019 711 6465",
                    "sales@rengas.my",
                ],
            },
            {
                title: "KUALA LUMPUR BRANCH",
                address: "No. 10, Jalan SB Jaya 9,\nTaman Perindustrian SB Jaya,\n47000 Sungai Buloh, Selangor,\nMalaysia.",
                contacts: [
                    "+603 6156 6466",
                    "+603 6156 6466",
                    "+6012 7697 621",
                    "sales@rengas.my",
                ],
            },
            {
                title: "PASAR RAYA RENGAS",
                address: "No. 7, 8, 9 & 10, Jalan Damai 2,\nTaman Damai, 81400 Senai,\nJohor Darul Takzim, Malaysia.",
                contacts: [
                    "+607 598 7200",
                    "+607 598 7200",
                    "+6012 710 7621",
                    "sales@rengas.my",
                ],
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
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(14)
            .text("www.rengas.my", width / 2 - 80, 670, {
            width: 160,
            align: "center",
        });
    }
    drawContactCard(doc, x, y, width, height, card) {
        doc.save();
        doc
            .roundedRect(x + 3, y + 5, width, height, 12)
            .fillOpacity(0.22)
            .fill("#222222");
        doc
            .fillOpacity(1)
            .roundedRect(x, y, width, height, 12)
            .lineWidth(1.3)
            .fillAndStroke("#FFFFFF", "#E6B83F");
        doc.restore();
        doc
            .fillColor("#172033")
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(card.title, x + 10, y + 15, {
            width: width - 20,
            height: 28,
            align: "center",
        });
        doc
            .moveTo(x + 22, y + 53)
            .lineTo(x + width - 22, y + 53)
            .lineWidth(1.5)
            .stroke("#F2B624");
        doc
            .fillColor("#172033")
            .font("Helvetica")
            .fontSize(8.5)
            .text(card.address, x + 14, y + 70, { width: width - 28, lineGap: 2 });
        const iconColors = ["#168CD2", "#168CD2", "#6C4AC7", "#10A76C", "#ED4A5A"];
        const iconLetters = ["T", "T", "F", "W", "E"];
        const contactStart = y + 145;
        card.contacts.forEach((contact, index) => {
            const rowY = contactStart + index * 24;
            doc.roundedRect(x + 15, rowY, 16, 16, 3).fill(iconColors[index]);
            doc
                .fillColor("#FFFFFF")
                .font("Helvetica-Bold")
                .fontSize(7)
                .text(iconLetters[index], x + 15, rowY + 5, {
                width: 16,
                align: "center",
            });
            doc
                .fillColor("#172033")
                .font("Helvetica-Bold")
                .fontSize(6.8)
                .text(contact, x + 39, rowY + 5, { width: width - 50 });
        });
    }
    drawProductCard(doc, product, image, logo, x, y, width, height, color) {
        const imageHeight = 116;
        if (image) {
            try {
                doc.image(image, x + 6, y + 5, {
                    fit: [width - 12, imageHeight - 10],
                    align: "center",
                    valign: "center",
                });
            }
            catch {
                this.drawImagePlaceholder(doc, logo, x, y, width, imageHeight);
            }
        }
        else {
            this.drawImagePlaceholder(doc, logo, x, y, width, imageHeight);
        }
        doc.rect(x, y + imageHeight, width, 82).fill(color);
        doc
            .fillColor("#FFFFFF")
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(product.description.toUpperCase(), x + 7, y + imageHeight + 9, {
            width: width - 14,
            height: 34,
            align: "center",
            ellipsis: true,
        });
        doc
            .moveTo(x + 12, y + imageHeight + 53)
            .lineTo(x + width - 12, y + imageHeight + 53)
            .lineWidth(1)
            .stroke("#FFFFFF");
        doc.fontSize(9).text(product.code, x + 7, y + imageHeight + 62, {
            width: width - 14,
            align: "center",
        });
        doc.rect(x, y + height - 20, width, 20).fill("#FFFFFF");
        doc
            .fillColor(color)
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(`UOM: ${product.uom}`, x + 7, y + height - 14, { width: width / 2 })
            .text(`RM ${Number(product.price).toFixed(2)}`, x + width / 2 - 3, y + height - 14, {
            width: width / 2 - 5,
            align: "right",
        });
        const borderInset = 0.75;
        doc.save();
        doc
            .rect(x + borderInset, y + borderInset, width - borderInset * 2, height - borderInset * 2)
            .lineWidth(1.5)
            .strokeOpacity(1)
            .stroke(color);
        doc.restore();
    }
    drawImagePlaceholder(doc, logo, x, y, width, height) {
        doc.save();
        doc.rect(x + 1, y + 1, width - 2, height - 2).fill("#FAFAFA");
        if (logo) {
            doc.opacity(0.22);
            doc.image(logo, x + 22, y + 18, {
                fit: [width - 44, height - 36],
                align: "center",
                valign: "center",
            });
        }
        else {
            doc
                .opacity(0.3)
                .fillColor("#111111")
                .font("Helvetica-Bold")
                .fontSize(10)
                .text("RENGA", x + 5, y + height / 2 - 5, {
                width: width - 10,
                align: "center",
            });
        }
        doc.restore();
    }
    displayDate(value) {
        const [year, month, day] = value.split("-");
        return `${day}-${month}-${year}`;
    }
    categoryColor(categoryName) {
        let hash = 0;
        for (const character of categoryName.toUpperCase()) {
            hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
        }
        return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
    }
    localAsset(relativePath) {
        const path = (0, node_path_1.join)(process.cwd(), relativePath);
        return (0, node_fs_1.existsSync)(path) ? this.pdfImage((0, node_fs_1.readFileSync)(path)) : null;
    }
    readUploadedFile(relativeUploadPath) {
        try {
            const cleanPath = relativeUploadPath
                .replace(/\\/g, "/")
                .replace(/^\/+/, "");
            if (!cleanPath ||
                cleanPath
                    .split("/")
                    .includes("..")) {
                return null;
            }
            const possiblePaths = [
                (0, node_path_1.join)((0, storage_1.getUploadDirectory)(), cleanPath),
                (0, node_path_1.join)(process.cwd(), "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "public", "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "dist", "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "dist", "public", "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "backend", "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "backend", "public", "uploads", cleanPath),
                (0, node_path_1.join)(process.cwd(), "..", "uploads", cleanPath),
            ];
            for (const path of possiblePaths) {
                if ((0, node_fs_1.existsSync)(path)) {
                    return (0, node_fs_1.readFileSync)(path);
                }
            }
            console.warn("Uploaded image file not found:", cleanPath);
            return null;
        }
        catch (error) {
            console.error("Could not read uploaded image:", relativeUploadPath, error);
            return null;
        }
    }
    imageBuffer(url, maxWidth = 480, maxHeight = 420, quality = 72) {
        const key = `${url || ""}|${maxWidth}|${maxHeight}|${quality}`;
        const cached = this.imageCache.get(key);
        if (cached)
            return cached;
        const pending = this.loadImageBuffer(url, maxWidth, maxHeight, quality);
        this.imageCache.set(key, pending);
        if (this.imageCache.size > 500) {
            const oldest = this.imageCache.keys().next().value;
            if (oldest)
                this.imageCache.delete(oldest);
        }
        return pending;
    }
    async loadImageBuffer(url, maxWidth = 480, maxHeight = 420, quality = 72) {
        if (!url?.trim()) {
            console.warn("Catalogue image URL is empty");
            return null;
        }
        const value = url.trim();
        try {
            let buffer = null;
            if (value.startsWith("data:image/")) {
                const commaIndex = value.indexOf(",");
                if (commaIndex !== -1) {
                    buffer = Buffer.from(value.slice(commaIndex + 1), "base64");
                }
            }
            if (!buffer) {
                let pathname = value;
                if (/^https?:\/\//i.test(value)) {
                    pathname =
                        new URL(value).pathname;
                }
                pathname = pathname
                    .replace(/\\/g, "/")
                    .split("?")[0]
                    .split("#")[0];
                const uploadMatch = pathname.match(/\/?uploads\/(.+)$/i);
                if (uploadMatch?.[1]) {
                    buffer =
                        this.readUploadedFile(decodeURIComponent(uploadMatch[1]));
                }
            }
            if (!buffer) {
                const backendBaseUrl = process.env.BACKEND_PUBLIC_URL ||
                    process.env.API_URL ||
                    `http://127.0.0.1:${process.env.PORT || 3000}`;
                const fetchUrl = /^https?:\/\//i.test(value)
                    ? value
                    : new URL(value.startsWith("/")
                        ? value
                        : `/${value}`, backendBaseUrl).toString();
                const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
                if (!response.ok) {
                    console.error("Catalogue image request failed:", response.status, fetchUrl);
                    return null;
                }
                const contentLength = Number(response.headers.get("content-length") || 0);
                if (contentLength >
                    12 * 1024 * 1024) {
                    console.error("Catalogue image is too large:", fetchUrl);
                    return null;
                }
                buffer = Buffer.from(await response.arrayBuffer());
            }
            if (!buffer ||
                buffer.length === 0) {
                console.error("Catalogue image is empty:", value);
                return null;
            }
            const optimized = await sharpFactory(buffer, {
                failOn: "none",
            })
                .rotate()
                .resize({
                width: maxWidth,
                height: maxHeight,
                fit: "inside",
                withoutEnlargement: true,
                fastShrinkOnLoad: true,
            })
                .flatten({
                background: "#FFFFFF",
            })
                .jpeg({
                quality,
                progressive: true,
                chromaSubsampling: "4:2:0",
                optimiseCoding: true,
            })
                .toBuffer();
            return optimized;
        }
        catch (error) {
            console.error("Catalogue image loading failed:", value, error);
            return null;
        }
    }
    pdfImage(buffer) {
        if (buffer.length < 8 || buffer.length > 12 * 1024 * 1024)
            return null;
        const isPng = buffer
            .subarray(0, 8)
            .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        if (isPng)
            return buffer;
        if (!isJpeg)
            return null;
        return this.stripEmptyJpegApp1Segments(buffer);
    }
    stripEmptyJpegApp1Segments(buffer) {
        const parts = [buffer.subarray(0, 2)];
        let offset = 2;
        while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
            const marker = buffer[offset + 1];
            if (marker === 0xda || marker === 0xd9)
                break;
            const length = buffer.readUInt16BE(offset + 2);
            if (length < 2 || offset + length + 2 > buffer.length)
                return buffer;
            if (!(marker === 0xe1 && length === 2)) {
                parts.push(buffer.subarray(offset, offset + length + 2));
            }
            offset += length + 2;
        }
        parts.push(buffer.subarray(offset));
        return Buffer.concat(parts);
    }
};
exports.CatalogueService = CatalogueService;
exports.CatalogueService = CatalogueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.DesignSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CatalogueService);
let CatalogueController = class CatalogueController {
    catalogue;
    constructor(catalogue) {
        this.catalogue = catalogue;
    }
    async generate(input, response) {
        try {
            await this.catalogue.generate(input, response);
        }
        catch (error) {
            console.error("Catalogue generation failed:", error);
            if (response.headersSent) {
                response.destroy(error instanceof Error ? error : undefined);
                return;
            }
            const statusCode = error instanceof common_1.BadRequestException ? 400 : 500;
            response.status(statusCode).json({
                statusCode,
                message: error instanceof Error ? error.message : "Catalogue generation failed",
            });
        }
    }
    async download(title, from, to, rawCategoryIds, response) {
        const categoryIds = String(rawCategoryIds || "")
            .split(",")
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0);
        try {
            await this.catalogue.generate({ title, from, to, categoryIds }, response);
        }
        catch (error) {
            console.error("Catalogue download failed:", error);
            if (response.headersSent) {
                response.destroy(error instanceof Error ? error : undefined);
                return;
            }
            const statusCode = error instanceof common_1.BadRequestException ? 400 : 500;
            response.status(statusCode).json({
                statusCode,
                message: error instanceof Error ? error.message : "Catalogue generation failed",
            });
        }
    }
};
exports.CatalogueController = CatalogueController;
__decorate([
    (0, common_1.Post)("generate"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GenerateCatalogueDto, Object]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)("download"),
    __param(0, (0, common_1.Query)("title")),
    __param(1, (0, common_1.Query)("from")),
    __param(2, (0, common_1.Query)("to")),
    __param(3, (0, common_1.Query)("categoryIds")),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "download", null);
exports.CatalogueController = CatalogueController = __decorate([
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, roles_decorator_1.Roles)(entities_2.Role.ADMIN),
    (0, common_1.Controller)("catalogues"),
    __metadata("design:paramtypes", [CatalogueService])
], CatalogueController);
//# sourceMappingURL=catalogue.js.map
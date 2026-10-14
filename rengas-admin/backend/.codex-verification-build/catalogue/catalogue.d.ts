import { Response } from "express";
import { Repository } from "typeorm";
import { Category, DesignSetting, Product } from "../entities";
declare class GenerateCatalogueDto {
    title: string;
    from: string;
    to: string;
    categoryIds: number[];
}
export declare class CatalogueService {
    private products;
    private categories;
    private designs;
    private readonly imageCache;
    constructor(products: Repository<Product>, categories: Repository<Category>, designs: Repository<DesignSetting>);
    generate(input: GenerateCatalogueDto, response: Response): Promise<void>;
    private drawCover;
    private drawCategoryPage;
    private drawContactPage;
    private drawContactCard;
    private drawProductCard;
    private drawImagePlaceholder;
    private displayDate;
    private categoryColor;
    private localAsset;
    private readUploadedFile;
    private imageBuffer;
    private loadImageBuffer;
    private pdfImage;
    private stripEmptyJpegApp1Segments;
}
export declare class CatalogueController {
    private readonly catalogue;
    constructor(catalogue: CatalogueService);
    generate(input: GenerateCatalogueDto, response: Response): Promise<void>;
    download(title: string, from: string, to: string, rawCategoryIds: string, response: Response): Promise<void>;
}
export {};

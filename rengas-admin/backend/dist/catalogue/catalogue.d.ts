import { Response } from "express";
import { Repository } from "typeorm";
import { Category, DesignSetting, Product } from "../entities";
type GenerateCatalogueDto = {
    title: string;
    from: string;
    to: string;
    categoryIds: number[];
};
export declare class CatalogueService {
    private products;
    private categories;
    private designs;
    constructor(products: Repository<Product>, categories: Repository<Category>, designs: Repository<DesignSetting>);
    generate(input: GenerateCatalogueDto): Promise<Buffer<ArrayBufferLike>>;
    private drawCover;
    private drawCategoryPage;
    private drawContactPage;
    private drawContactCard;
    private drawProductCard;
    private drawImagePlaceholder;
    private displayDate;
    private categoryColor;
    private localAsset;
    private imageBuffer;
    private pdfImage;
}
export declare class CatalogueController {
    private readonly catalogue;
    constructor(catalogue: CatalogueService);
    generate(input: GenerateCatalogueDto, response: Response): Promise<void>;
}
export {};

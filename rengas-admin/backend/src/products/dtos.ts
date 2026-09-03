import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { OrderStatus } from "../entities";

const PHONE_PATTERN = /^\+?[0-9\s()-]{8,40}$/;
const IMAGE_URL_PATTERN = /^(?:\/uploads\/[a-zA-Z0-9_./-]+|https:\/\/[^\s]+)$/;

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  uom: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999.99)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ValidateIf((_object, value) => value !== "" && value !== null)
  @Matches(IMAGE_URL_PATTERN, {
    message: "imageUrl must be an HTTPS URL or a local /uploads path",
  })
  imageUrl?: string | null;
}

export class CatalogueStatusDto {
  @IsBoolean()
  enabled: boolean;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional() @IsString() @MaxLength(180) companyName?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(100) tinNumber?: string;
  @IsOptional() @Matches(PHONE_PATTERN) phoneNumber?: string;
  @IsOptional() @Matches(PHONE_PATTERN) whatsappNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(180) companyName?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(100) tinNumber?: string;
  @IsOptional() @Matches(PHONE_PATTERN) phoneNumber?: string;
  @IsOptional() @Matches(PHONE_PATTERN) whatsappNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
}

export class UpdateOrderItemDto {
  @Type(() => Number) @IsInt() @Min(1) productId: number;
  @Type(() => Number) @IsNumber() @Min(0.01) quantity: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number;
}

export class UpdateOrderDto {
  @IsOptional() @IsIn(["PRINT"]) action?: "PRINT";
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) orderDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) customerId?: number;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];
}

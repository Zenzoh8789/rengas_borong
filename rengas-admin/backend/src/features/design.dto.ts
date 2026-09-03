import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

const ASSET_URL_PATTERN = /^(?:\/uploads\/[a-zA-Z0-9_./-]+|https:\/\/[^\s]+)$/;

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ValidateIf((_object, value) => value !== "" && value !== null)
  @Matches(ASSET_URL_PATTERN)
  topBannerUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ValidateIf((_object, value) => value !== "" && value !== null)
  @Matches(ASSET_URL_PATTERN)
  productPhotoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ValidateIf((_object, value) => value !== "" && value !== null)
  @Matches(ASSET_URL_PATTERN)
  footerImageUrl?: string | null;
}

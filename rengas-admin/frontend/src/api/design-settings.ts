export type DesignImages = {
  topBannerUrl: string;
  productPhotoUrl: string;
};

// API responses also contain database metadata, which PATCH must not receive.
export function designImages(value: Partial<DesignImages> | null): DesignImages {
  return {
    topBannerUrl: value?.topBannerUrl ?? "",
    productPhotoUrl: value?.productPhotoUrl ?? "",
  };
}

const STORAGE_KEY = "catalogue-disabled-product-ids";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getDisabledCatalogueProductIds(): number[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    const parsed: unknown = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return [
      ...new Set(
        parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  } catch {
    return [];
  }
}

export function isProductEnabledForCatalogue(productId: number): boolean {
  return !getDisabledCatalogueProductIds().includes(productId);
}

export function setProductCatalogueStatus(
  productId: number,
  enabled: boolean,
): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const disabledIds = new Set(getDisabledCatalogueProductIds());

  if (enabled) {
    disabledIds.delete(productId);
  } else {
    disabledIds.add(productId);
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...disabledIds]));

  window.dispatchEvent(
    new CustomEvent("catalogue-product-status-changed", {
      detail: {
        productId,
        enabled,
      },
    }),
  );
}

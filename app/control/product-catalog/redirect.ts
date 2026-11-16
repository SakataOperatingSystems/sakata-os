export type LegacyCatalogueSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function getCatalogueRedirect(
  params: LegacyCatalogueSearchParams,
): string {
  const product = Array.isArray(params.product)
    ? params.product[0]
    : params.product;

  return product
    ? `/control/catalog?${new URLSearchParams({ product }).toString()}`
    : "/control/catalog";
}

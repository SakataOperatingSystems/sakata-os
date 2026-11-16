import { redirect } from "next/navigation";
import {
  getCatalogueRedirect,
  type LegacyCatalogueSearchParams,
} from "./redirect";

export default async function LegacyProductCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<LegacyCatalogueSearchParams> | LegacyCatalogueSearchParams;
}) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  redirect(getCatalogueRedirect(params));
}

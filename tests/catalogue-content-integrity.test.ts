import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CURATED_PRODUCT_IDENTITIES } from "../app/control/catalog/catalogue-registry";

const source = readFileSync(
  new URL("../app/control/catalog/page.tsx", import.meta.url),
  "utf8",
);
const catalogueImplementation = [
  "../app/control/catalog/page.tsx",
  "../app/control/catalog/catalogue-registry.ts",
  "../app/control/catalog/catalogue.ts",
  "../app/api/control/catalog/route.ts",
  "../app/components/theme-preferences.tsx",
  "../app/components/theme-runtime.tsx",
  "../app/lib/theme-preference.ts",
  "../app/layout.tsx",
  "../app/globals.css",
]
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");

function extractProducts() {
  const declarationStart = source.indexOf("const products: Product[] = [");
  const declarationEnd = source.indexOf("\n];", declarationStart);

  expect(declarationStart).toBeGreaterThanOrEqual(0);
  expect(declarationEnd).toBeGreaterThan(declarationStart);

  const declaration = source.slice(declarationStart, declarationEnd);
  const blocks = [
    ...declaration.matchAll(
      /\{\s*id:\s*"([^"]+)"([\s\S]*?)(?=\n  \},|\n\])/g,
    ),
  ];

  return blocks.map(([, id, body]) => {
    const readString = (field: string) => {
      const match = body.match(new RegExp(`\\b${field}:\\s*"([^"]*)"`));
      return match?.[1] ?? "";
    };
    const readArray = (field: string) => {
      const match = body.match(
        new RegExp(`\\b${field}:\\s*\\[([^\\]]*)\\]`, "s"),
      );
      return match
        ? [...match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(
            ([, value]) => value,
          )
        : [];
    };

    return {
      id,
      name: readString("name").replace(/^SAKATA /, ""),
      short: readString("short"),
      category: readString("category"),
      icon: readString("icon"),
      description: readString("description"),
      audience: readString("audience"),
      promise: readString("promise"),
      modules: readArray("modules"),
      capabilities: readArray("capabilities"),
      workflows: readArray("workflows"),
      records: readArray("records"),
    };
  });
}

const expectedNames = [
  "Education OS",
  "Business OS",
  "Commerce OS",
  "Finance OS",
  "Fleet & Mobility OS",
  "Property OS",
  "Hospitality OS",
  "Garage OS",
  "Parking & Access OS",
  "Manufacturing OS",
  "Microfinance OS",
  "Supply Chain OS",
  "Healthcare Administration OS",
  "Construction OS",
  "Agriculture OS",
  "Workforce OS",
];

describe("curated product catalogue content", () => {
  const products = extractProducts();

  it("contains the 16 expected products in the established display order", () => {
    expect(CURATED_PRODUCT_IDENTITIES.map(({ name }) => name)).toEqual(
      expectedNames.map((name) => `SAKATA ${name}`),
    );
    expect(CURATED_PRODUCT_IDENTITIES.map(({ id }) => id)).toEqual([
      "education",
      "business",
      "commerce",
      "finance",
      "fleet",
      "property",
      "hospitality",
      "garage",
      "parking",
      "manufacturing",
      "microfinance",
      "supply",
      "health",
      "construction",
      "agriculture",
      "workforce",
    ]);
    expect(products.map(({ name }) => name)).toEqual(expectedNames);
    expect(products).toHaveLength(16);
    expect(new Set(products.map(({ id }) => id)).size).toBe(16);
    expect(new Set(products.map(({ name }) => name)).size).toBe(16);
    expect(
      products.filter(({ name }) => name === "Workforce OS"),
    ).toHaveLength(1);
  });

  it("has complete, unique modules, capabilities, workflows, and core records", () => {
    for (const product of products) {
      expect(product.short, product.name).not.toBe("");
      expect(product.category, product.name).not.toBe("");
      expect(product.icon, product.name).not.toBe("");
      expect(product.description, product.name).not.toBe("");
      expect(product.audience, product.name).not.toBe("");
      expect(product.promise, product.name).not.toBe("");
      expect(product.modules, product.name).toHaveLength(12);
      expect(new Set(product.modules).size, product.name).toBe(12);
      expect(product.capabilities, product.name).toHaveLength(7);
      expect(new Set(product.capabilities).size, product.name).toBe(7);
      expect(product.workflows, product.name).toHaveLength(4);
      expect(new Set(product.workflows).size, product.name).toBe(4);
      expect(product.records.length, product.name).toBeGreaterThan(0);
      expect(new Set(product.records).size, product.name).toBe(
        product.records.length,
      );
    }
  });

  it("keeps all Explore sections and foundation cards in the page", () => {
    for (const section of [
      "Product promise",
      "Registered modules & destinations",
      "Core capabilities",
      "Designed for",
      "Key workflows",
      "Core records",
      "Shared foundation",
      "Domain-specific workflows",
      "Connected intelligence",
    ]) {
      expect(source).toContain(section);
    }
  });

  it("contains valid Unicode rather than the known mojibake spellings", () => {
    expect(catalogueImplementation).not.toMatch(
      /â†|âœ|âŒ|â–|â˜|Ã—|ï¿½|\uFFFD/,
    );
  });

  it("retains the catalogue interface glyphs and view labels as Unicode text", () => {
    for (const glyph of [
      "◈",
      "▦",
      "◇",
      "◎",
      "↗",
      "⌂",
      "✳",
      "⌘",
      "▤",
      "▥",
      "◉",
      "⇄",
      "✚",
      "⌗",
      "❋",
      "→",
      "✓",
      "·",
      "Grid",
      "List",
    ]) {
      expect(source).toContain(glyph);
    }
  });

  it("provides a deterministic content digest for reviewable catalogue changes", () => {
    const digest = createHash("sha256")
      .update(JSON.stringify(products))
      .digest("hex");

    expect(digest).toBe("f2d3de0275b84f2487ea6153f6a08c0bd27ad9a900cb0bc985921047caa7b6d6");
  });
});

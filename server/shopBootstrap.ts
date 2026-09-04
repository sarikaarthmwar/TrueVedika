import { sql } from "drizzle-orm";
import { db } from "./db.js";

const createShopProductsTable = sql.raw(`
  CREATE TABLE IF NOT EXISTS shop_products (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    image text NOT NULL,
    category text NOT NULL,
    affiliate_url text NOT NULL,
    clicks integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )
`);

export async function ensureShopProductsTable() {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.execute(createShopProductsTable);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

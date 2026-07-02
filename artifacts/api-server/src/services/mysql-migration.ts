import mysql from "mysql2/promise";
import { db, productsTable, suppliersTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface MysqlMigrationResult {
  connected: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export async function migrateFromMysql(): Promise<MysqlMigrationResult> {
  const result: MysqlMigrationResult = { connected: false, imported: 0, skipped: 0, errors: [] };

  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT ?? "3306");
  const database = process.env.MYSQL_DATABASE ?? "multi_food_db";
  const user = process.env.MYSQL_USERNAME ?? "root";
  const password = process.env.MYSQL_PASSWORD ?? "";

  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection({ host, port, database, user, password });
    result.connected = true;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Connexion MySQL impossible");
    return result;
  }

  try {
    const [tables] = await conn.query<mysql.RowDataPacket[]>("SHOW TABLES");
    const tableNames = tables.map(r => Object.values(r)[0] as string);
    const productTable = tableNames.find(t => /product/i.test(t)) ?? "products";
    const vendorTable = tableNames.find(t => /vendor|supplier|seller/i.test(t));

    const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${productTable}\` LIMIT 500`);

    let defaultSupplierId: number | null = null;
    const [existingSup] = await db.select().from(suppliersTable).limit(1);
    if (existingSup) {
      defaultSupplierId = existingSup.id;
    } else {
      const [sup] = await db.insert(suppliersTable).values({
        companyName: "Import MySQL Legacy",
        wilaya: "Alger",
        verificationLevel: 1,
      }).returning();
      defaultSupplierId = sup.id;
    }

    for (const row of rows) {
      const name = String(row.name ?? row.title ?? row.product_name ?? "").trim();
      if (!name) {
        result.skipped++;
        continue;
      }

      const price = Number(row.price ?? row.price_fob ?? row.unit_price ?? 10) || 10;
      try {
        await db.insert(productsTable).values({
          name,
          description: String(row.description ?? row.desc ?? ""),
          category: String(row.category ?? row.category_name ?? "Alimentation"),
          supplierId: defaultSupplierId!,
          supplierName: vendorTable ? String(row.vendor_name ?? row.supplier_name ?? "Legacy") : "Legacy MySQL",
          moq: Number(row.moq ?? row.min_qty ?? 100) || 100,
          moqUnit: String(row.moq_unit ?? row.unit ?? "kg"),
          priceExw: price * 0.95,
          priceFob: price,
          priceCfr: price * 1.08,
          priceCif: price * 1.12,
          exportStatus: "published",
          imageUrl: row.image ?? row.image_url ?? row.thumbnail ?? null,
        });
        result.imported++;
      } catch (err) {
        result.errors.push(`${name}: ${err instanceof Error ? err.message : "erreur"}`);
      }
    }
  } catch (err) {
    logger.error({ err }, "Migration MySQL");
    result.errors.push(err instanceof Error ? err.message : "Erreur migration");
  } finally {
    await conn.end();
  }

  return result;
}

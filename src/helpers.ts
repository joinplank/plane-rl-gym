import { Client } from "pg";
import fs from "fs";
// Extract database name from connection URL

/**
 * Ensures that the specified directory exists, creating it if necessary
 * @param dirPath - Path to the directory
 */
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

import path from "path";
import { OUTPUT_DIR } from "./client";
import { sleep } from "openai/core";

/**
 * Fetches all rows from a specified table JSON file
 * @param tableName - Name of the table to query
 * @returns Array of objects representing table rows
 */
const getTableData = (tableName: string): object[] => {
  console.log("Getting table data for", tableName);
  sleep(1000);
  const filePath = path.join(OUTPUT_DIR, `${tableName}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

/**
 * Inserts records into a specified table.
 * Handles NULL values appropriately.
 *
 * @param pgClient - The PostgreSQL client instance.
 * @param tableName - The name of the table to insert into.
 * @param records - An array of objects representing records to insert.
 */
async function insertRecords(
  pgClient: Client,
  tableName: string,
  records: Record<string, any>[]
): Promise<void> {
  if (!records.length) {
    console.log("No records to insert.");
    return;
  }

  const keys = Object.keys(records[0]);
  const columns = keys.map((key) => `"${key}"`).join(", ");
  const placeholders = records
    .map(
      (x, i) =>
        `(${keys.map((y, j) => `$${i * keys.length + j + 1}`).join(", ")})`
    )
    .join(", ");

  const values = records.flatMap((record) =>
    keys.map((key) => (record[key] !== undefined ? record[key] : null))
  );

  const query = `INSERT INTO "${tableName}" (${columns}) VALUES ${placeholders};`;

  try {
    await pgClient.query(query, values);
    console.log(`Inserted ${records.length} record(s) into ${tableName}`);
  } catch (error) {
    console.error(`Error inserting records into ${tableName}:`);
  }
}

export { ensureDirectoryExists, getTableData, insertRecords };

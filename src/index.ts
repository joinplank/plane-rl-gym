/**
 * Database Schema Populator
 *
 * This utility introspects a PostgreSQL database schema and generates synthetic data
 * for tables in the correct dependency order. It uses OpenAI's API to generate realistic
 * test data while respecting foreign key constraints.
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { OUTPUT_DIR, pgClient } from './client';
import { INSERT_ORDER, seedConfigs } from './config';
import { buildTableDependencyGraph } from './constructGraph';
import { ensureDirectoryExists, getTableData, insertRecords } from './helpers';
import {
  ColumnGeneratorMap,
  DatabaseSchema,
  Row,
  SeedConfig,
  TableSchema,
} from './types';

/**
 * Introspects the database to extract schema information
 * @param client - PostgreSQL client instance
 * @returns Comprehensive database schema information
 */
async function introspectDatabase(client: Client): Promise<DatabaseSchema> {
  // Query to get all tables in the public schema
  const tablesQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const tablesRes = await client.query(tablesQuery);
  const tables = tablesRes.rows.map((row) => row.table_name);

  const schemaInfo: DatabaseSchema = {};

  // For each table, get columns and foreign key information
  for (const table of tables) {
    // Get column information with character_maximum_length
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1
    `;
    const columnsRes = await client.query(columnsQuery, [table]);
    const columns = columnsRes.rows;

    // Get foreign key information
    const foreignKeysQuery = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `;
    const foreignKeysRes = await client.query(foreignKeysQuery, [table]);
    const foreignKeys = foreignKeysRes.rows;

    schemaInfo[table] = {
      columns,
      foreignKeys,
    };
  }

  return schemaInfo;
}

const generateRowsPromise = async (
  tableSchema: TableSchema,
  columns: ColumnGeneratorMap,
  row: Row,
  rows: Array<Row>,
  foreignRow?: Row
) => {
  for (const [columnName, generator] of Object.entries(columns)) {
    const columnSchema = tableSchema.columns.find(
      (column) => column.column_name == columnName
    );
    if (columnSchema) {
      row[columnName] = await generator({
        currentRow: row,
        columnSchema,
        tableSchema,
        tableData: rows,
        foreignRow,
      });
    }
  }

  return row;
};

const generateRows = async (
  seedConfig: SeedConfig,
  tableSchema: TableSchema
) => {
  if (seedConfig.skip_generate || !seedConfig.rowGeneration || !seedConfig.columns) {
    return;
  }

  const {
    columns,
    tableName,
    rowGeneration,
    concurrentGeneration,
    primaryKeys,
  } = seedConfig;

  const rows: Array<Row> = [];

  if (rowGeneration.type === 'static') {
    console.log(
      `Generating ${rowGeneration.count} static rows for ${tableName}...`
    );
    if (concurrentGeneration) {
      const rowPromises = [];
      for (let i = 0; i < rowGeneration.count; i++) {
        rowPromises.push(generateRowsPromise(tableSchema, columns, {}, rows));
      }
      const generatedRows = await Promise.all(rowPromises);
      rows.push(...generatedRows);
      console.log(
        `Finished generating ${generatedRows.length} concurrent rows for ${tableName}`
      );
    } else {
      for (let i = 0; i < rowGeneration.count; i++) {
        const row: Row = await generateRowsPromise(
          tableSchema,
          columns,
          {},
          rows
        );
        rows.push(row);
      }
      console.log(
        `Finished generating ${rows.length} sequential rows for ${tableName}`
      );
    }
  } else if (rowGeneration.type === 'foreignTable') {
    const foreignTableData = getTableData(rowGeneration.tableName);
    console.log(
      `Generating rows for ${tableName} based on foreign table ${rowGeneration.tableName}...`
    );

    const foreignRowLookup = foreignTableData.reduce(
      (acc: Record<string, Row>, row: Row) => {
        acc[row[rowGeneration.foreignColumn]] = row;
        return acc;
      },
      {}
    ) as Record<string, Row>;

    const uniqueForeignValues = Object.keys(foreignRowLookup);
    if (concurrentGeneration) {
      const rowPromises = [];
      for (const foreignValue of uniqueForeignValues) {
        let count = rowGeneration.countPerEntry;
        if (typeof count === 'object') {
          count =
            Math.floor(Math.random() * (count.max - count.min + 1)) + count.min;
        }
        for (let i = 0; i < count; i++) {
          rowPromises.push(
            generateRowsPromise(
              tableSchema,
              columns,
              { [rowGeneration.tableColumn]: foreignValue },
              rows,
              foreignRowLookup[foreignValue]
            )
          );
        }
      }
      const generatedRows = await Promise.all(rowPromises);
      rows.push(...generatedRows);
      console.log(
        `Finished generating ${generatedRows.length} concurrent foreign-keyed rows for ${tableName}`
      );
    } else {
      for (const foreignValue of uniqueForeignValues) {
        let count = rowGeneration.countPerEntry;
        if (typeof count === 'object') {
          count =
            Math.floor(Math.random() * (count.max - count.min + 1)) + count.min;
        }
        for (let i = 0; i < count; i++) {
          const row: Row = await generateRowsPromise(
            tableSchema,
            columns,
            { [rowGeneration.tableColumn]: foreignValue },
            rows,
            foreignRowLookup[foreignValue]
          );
          rows.push(row);
          console.log(`Generated ${rows.length} rows for ${tableName}`);
        }
      }
      console.log(
        `Finished generating ${rows.length} sequential foreign-keyed rows for ${tableName}`
      );
    }
  }
  let deduplicatedRows = rows;
  if (primaryKeys) {
    deduplicatedRows = rows.filter(
      (row, index, self) =>
        index ===
        self.findIndex((t) =>
          primaryKeys.every((key: string) => t[key] === row[key])
        )
    );
    if (deduplicatedRows.length < rows.length) {
      console.log(
        `Removed ${
          rows.length - deduplicatedRows.length
        } duplicate rows from ${tableName}`
      );
    }
  }

  const filePath = path.join(OUTPUT_DIR, `${tableName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deduplicatedRows, null, 2));
  console.log(`Wrote ${deduplicatedRows.length} rows to ${filePath}`);
};

const generateSeedData = async (
  dbSchema: DatabaseSchema,
  insertOrder: Array<string>
) => {
  for (const tableName of insertOrder) {
    const seedConfig = seedConfigs.find((i) => i.tableName == tableName);
    if (!seedConfig || seedConfig.skip_generate) continue;
    try {
      await generateRows(seedConfig, dbSchema[tableName]);
      console.log(`generated ${tableName}`);
    } catch (err) {
      console.log(`error generating ${tableName}`);
      console.log(err);
    }
  }
};

const importData = async (pgClient: Client, insertOrder: Array<string>) => {
  for (const tableName of insertOrder) {
    const seedConfig = seedConfigs.find((i) => i.tableName == tableName);
    if (!seedConfig || seedConfig.skip_import) continue;

    try {
      const tableData = await getTableData(tableName);
      for (const row of tableData) {
        try {
          await insertRecords(pgClient, tableName, [row]);
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(`error inserting records for ${tableName}`);
      console.log(err);
    }
  }
};

/**
 * Resets the database by truncating all tables in reverse dependency order
 * @param pgClient - PostgreSQL client instance
 * @param insertOrder - Array of table names in insertion order
 */
const resetDatabase = async (pgClient: Client, insertOrder: Array<string>) => {
  console.log('Resetting database - clearing all tables...');
  
  // Reverse the order to handle foreign key dependencies
  const resetOrder = [...insertOrder].reverse();
  
  try {
    // Disable foreign key checks temporarily for more efficient truncation
    await pgClient.query('SET session_replication_role = replica;');
    
    for (const tableName of resetOrder) {

      const seedConfig = seedConfigs.find((i) => i.tableName == tableName);
      if ((!seedConfig || seedConfig.skip_import) && !tableName.includes('transaction_log')) continue;
      
      try {
        await pgClient.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        console.log(`✓ Cleared table: ${tableName}`);
      } catch (err) {
        console.log(`Warning: Could not clear table ${tableName}:`, err);
      }
    }
    
    // Re-enable foreign key checks
    await pgClient.query('SET session_replication_role = DEFAULT;');
    
    console.log('✅ Database reset completed successfully');
  } catch (err) {
    console.error('❌ Error during database reset:', err);
    // Ensure foreign key checks are re-enabled even if there's an error
    try {
      await pgClient.query('SET session_replication_role = DEFAULT;');
    } catch (resetErr) {
      console.error('Failed to re-enable foreign key checks:', resetErr);
    }
    throw err;
  }
};

/**
 * Main function that coordinates the database population process
 */
const main = async () => {
  console.log('Starting database population process...');

  ensureDirectoryExists(OUTPUT_DIR);

  await pgClient.connect();
  const dbSchema = await introspectDatabase(pgClient);
  // console.log('Building table dependency graph...');

  // const graph = await buildTableDependencyGraph(CONNECTION_URL);
  // const insertOrder = getTableOrderForOperations(graph);

  await generateSeedData(dbSchema, INSERT_ORDER);
  console.log('finished generating data');
  process.exit(0);
};

export {
  buildTableDependencyGraph,
  ensureDirectoryExists,
  generateSeedData,
  importData,
  introspectDatabase,
  resetDatabase,
};

import { importData, resetDatabase } from '.';
import { OUTPUT_DIR, pgClient } from './client';
import { INSERT_ORDER } from './config';
import { ensureDirectoryExists } from './helpers';

const main = async () => {
  console.log('Starting database population process...');

  ensureDirectoryExists(OUTPUT_DIR);

  await pgClient.connect();

  console.log('Building table dependency graph...');

  // const insertOrder = getTableOrderForOperations(graph);

  // Reset database before importing to ensure clean state
  console.log('Importing data...');
  await importData(pgClient, INSERT_ORDER);
  console.log('Finished importing data');
  process.exit(0);
};

main().catch(console.error);

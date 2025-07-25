import { generateSeedData, introspectDatabase } from '.';
import { OUTPUT_DIR, pgClient } from './client';
import { INSERT_ORDER } from './config';
import { ensureDirectoryExists } from './helpers';

const main = async () => {
  console.log('Starting database population process...');

  ensureDirectoryExists(OUTPUT_DIR);

  await pgClient.connect();
  const dbSchema = await introspectDatabase(pgClient);
  // console.log("Building table dependency graph...");

  // const graph = await buildTableDependencyGraph(CONNECTION_URL);
  // const insertOrder = getTableOrderForOperations(graph);

  await generateSeedData(dbSchema, INSERT_ORDER);
  console.log('finished generating data');
  process.exit(0);
};

main().catch(console.error);

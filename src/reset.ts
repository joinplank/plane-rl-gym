import { resetDatabase } from '.';
import { pgClient } from './client';
import { INSERT_ORDER } from './config';

const main = async () => {
  console.log('Starting database reset process...');

  await pgClient.connect();

  await resetDatabase(pgClient, INSERT_ORDER);
  
  console.log('Database reset completed successfully');
  process.exit(0);
};

main().catch(console.error); 
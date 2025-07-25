import * as dotenv from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';
import { Client } from 'pg';

dotenv.config();

export const CONNECTION_URL =
  process.env.CONNECTION_URL || 'postgresql://plane:plane@plane-db:5432/plane';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const pgClient = new Client({ connectionString: CONNECTION_URL });
export const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

const extractDbName = (connectionUrl: string): string => {
  try {
    // Extract the database name from the connection URL
    const dbNameMatch = connectionUrl.match(/\/([^/]+)$/);
    return dbNameMatch ? dbNameMatch[1] : 'plane';
  } catch (error) {
    console.warn(
      "Could not extract database name from connection URL, using 'plane'"
    );
    return 'plane';
  }
};

export const OUTPUT_DIR = path.join(
  process.cwd(),
  'data',
  extractDbName(CONNECTION_URL)
);

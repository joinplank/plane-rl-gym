/**
 * Represents a column in a database table.
 *
 * @property {string} column_name - The name of the column.
 * @property {string} data_type - The data type of the column.
 * @property {"YES" | "NO"} is_nullable - Indicates if the column can be null.
 * @property {(string | null)} column_default - The default value of the column, or null if no default.
 * @property {(number | null)} character_maximum_length - The maximum length of the column, or null if not applicable.
 */
interface Column {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
}

/**
 * Represents a foreign key constraint in a database table.
 *
 * @property {string} constraint_name - The name of the foreign key constraint.
 * @property {string} column_name - The name of the column that the foreign key references.
 * @property {string} foreign_table_name - The name of the foreign table.
 * @property {string} foreign_column_name - The name of the foreign column.
 */
interface ForeignKey {
  constraint_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

/**
 * Represents the schema of a database table.
 *
 * @property {Column[]} columns - An array of columns in the table.
 * @property {ForeignKey[]} foreignKeys - An array of foreign key constraints in the table.
 */
interface TableSchema {
  columns: Column[];
  foreignKeys: ForeignKey[];
}

/**
 * Represents the schema of a database.
 *
 * @property {[tableName: string]: TableSchema} - A mapping of table names to their schemas.
 */
interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

/**
 * Parameters for a ColumnValueGenerator function.
 *
 * @property {Record<string, any>} currentRow - The current row being generated.
 * @property {TableSchema} tableSchema - The schema of the table.
 * @property {Record<string, any>} tableData - The data of the table.
 * @property {Column} columnSchema - The schema of the column.
 */
type ColumnValueGeneratorParams = {
  currentRow: Record<string, any>;
  tableSchema: TableSchema;
  tableData: Record<string, any>;
  columnSchema: Column;
  foreignRow?: Record<string, any>;
};

/**
 * A function that generates a value for a column.
 *
 * @param {ColumnValueGeneratorParams} params - The parameters for the generator.
 * @returns {(Promise<T> | T)} - The generated value.
 */
type ColumnValueGenerator<T> = (
  params: ColumnValueGeneratorParams
) => Promise<T> | T;

/**
 * Configuration for generating rows.
 *
 * @property {"static" | "foreignTable"} type - The type of row generation.
 * @property {(number | { min: number; max: number })} count - The count of rows to generate, or a range for dynamic count.
 * @property {string} tableName - The name of the foreign table, if applicable.
 * @property {string} foreignColumn - The name of the foreign column, if applicable.
 * @property {string} tableColumn - The name of the column in the current table, if applicable.
 */
type RowGenerationConfig =
  | { type: 'static'; count: number }
  | {
      type: 'foreignTable';
      tableName: string;
      foreignColumn: string;
      tableColumn: string;
      countPerEntry: number | { min: number; max: number };
    };

type ColumnGeneratorMap = {
  [columnName: string]: ColumnValueGenerator<any>;
};

/**
 * Configuration for seeding a table with data.
 *
 * @property {string} tableName - The name of the table.
 * @property {RowGenerationConfig} rowGeneration - The configuration for generating rows.
 * @property {boolean} concurrentGeneration - Indicates if rows should be generated concurrently.
 * @property {{ [columnName: string]: ColumnValueGenerator<any> }} columns - A mapping of column names to their value generators.
 */
type SeedConfig =
  | {
      tableName: string;
      skip_generate?: true;
      skip_import?: true | false;
      rowGeneration?: null;
      primaryKeys?: null;
      columns?: ColumnGeneratorMap;
      concurrentGeneration?: null;
    }
  | {
      tableName: string;
      skip_generate?: false;
      skip_import?: false;
      rowGeneration: RowGenerationConfig;
      primaryKeys?: Array<string>;
      columns: ColumnGeneratorMap;
      concurrentGeneration?: boolean;
    };

type Row = Record<string, any>;

/**
 * Represents a Kafka message payload from Debezium
 *
 * @property {any} before - The row data before the operation (null for INSERT)
 * @property {any} after - The row data after the operation (null for DELETE)
 * @property {object} source - Source metadata from Debezium
 * @property {"c" | "r" | "u" | "d" } op - Operation type (create, read, update, delete)
 * @property {number} ts_ms - Timestamp in milliseconds
 * @property {any} transaction - Transaction metadata (optional)
 */
interface DebeziumPayload {
  before?: any;
  after?: any;
  source: {
    version: string;
    connector: string;
    name: string;
    ts_ms: number;
    snapshot: string;
    db: string;
    sequence?: string;
    schema: string;
    table: string;
    txId?: number;
    lsn?: number;
    xmin?: number;
  };
  op: 'c' | 'r' | 'u' | 'd'; // create, read, update, delete
  ts_ms: number;
  transaction?: {
    id: string;
    total_order: number;
    data_collection_order: number;
  };
}

/**
 * Represents a transaction log record to be stored in the database
 *
 * @property {string} id - UUID of the transaction log entry
 * @property {Date} created_at - Timestamp when the log entry was created
 * @property {string} entity_table - The database table that was modified
 * @property {"INSERT" | "UPDATE" | "DELETE"} operation - The database operation performed
 * @property {object} before - The row data before the operation (JSON)
 * @property {object} after - The row data after the operation (JSON)
 */
interface TransactionLogRecord {
  id: string;
  created_at: Date;
  entity_table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  before: object | null;
  after: object | null;
}

/**
 * Configuration for Kafka consumer topics
 *
 * @property {string} topic - The Kafka topic name
 * @property {string} table - The database table name this topic represents
 */
interface TopicConfig {
  topic: string;
  table: string;
}

export {
  Column,
  ColumnGeneratorMap,
  ColumnValueGenerator,
  ColumnValueGeneratorParams,
  DatabaseSchema,
  DebeziumPayload,
  ForeignKey,
  Row,
  SeedConfig,
  TableSchema,
  TopicConfig,
  TransactionLogRecord,
};

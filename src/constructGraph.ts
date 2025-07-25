import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

interface TableNode {
  name: string;
  dependencies: string[];
  dependents: string[];
}

type DependencyGraph = Record<string, TableNode>;

async function buildTableDependencyGraph(
  connectionUrl: string
): Promise<DependencyGraph> {
  const pool = new Pool({
    connectionString: connectionUrl,
  });

  const db = drizzle(pool);

  const foreignKeysQuery = sql`
    SELECT
      tc.table_name AS source_table,
      ccu.table_name AS target_table
    FROM
      information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.columns AS col
        ON col.table_name = kcu.table_name
        AND col.column_name = kcu.column_name
    WHERE
      tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND col.is_nullable = 'NO'; -- Exclude nullable foreign keys
  `;

  const tablesQuery = sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  `;

  const [foreignKeys, tables] = await Promise.all([
    db.execute(foreignKeysQuery),
    db.execute(tablesQuery),
  ]);

  const graph: DependencyGraph = {};

  for (const table of tables.rows) {
    const table_name = table['table_name'] as string;
    graph[table_name] = {
      name: table_name,
      dependencies: [],
      dependents: [],
    };
  }

  for (const fk of foreignKeys.rows) {
    const sourceTable = fk['source_table'] as string;
    const targetTable = fk['target_table'] as string;

    if (!graph[sourceTable]) {
      graph[sourceTable] = {
        name: sourceTable,
        dependencies: [],
        dependents: [],
      };
    }
    if (!graph[targetTable]) {
      graph[targetTable] = {
        name: targetTable,
        dependencies: [],
        dependents: [],
      };
    }

    if (!graph[sourceTable].dependencies.includes(targetTable)) {
      graph[sourceTable].dependencies.push(targetTable);
    }

    if (!graph[targetTable].dependents.includes(sourceTable)) {
      graph[targetTable].dependents.push(sourceTable);
    }
  }

  await pool.end();

  return graph;
}
function detectCycle(graph: DependencyGraph): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(table: string, path: string[]): string[] | null {
    if (visiting.has(table)) return [...path, table]; // Cycle detected
    if (visited.has(table)) return null; // Already processed

    visiting.add(table);
    for (const dep of graph[table].dependencies) {
      const cycle = dfs(dep, [...path, table]);
      if (cycle) return cycle;
    }
    visiting.delete(table);
    visited.add(table);

    return null;
  }

  for (const table of Object.keys(graph)) {
    const cycle = dfs(table, []);
    if (cycle) return cycle;
  }

  return null; // No cycles
}

function getTableOrderForOperations(graph: DependencyGraph): string[] {
  const cycle = detectCycle(graph);
  if (cycle) {
    console.warn('Cycle detected in dependency graph:', cycle);
    console.warn(
      'Consider inserting with NULL foreign keys and updating after initial seeding.'
    );
  }

  const result: string[] = [];
  const inDegree: Record<string, number> = {};

  for (const tableName in graph) {
    inDegree[tableName] = graph[tableName].dependencies.length;
  }

  const queue: string[] = Object.keys(graph).filter(
    (table) => inDegree[table] === 0
  );

  while (queue.length > 0) {
    const table = queue.shift();
    if (table) {
      result.push(table);

      for (const dependent of graph[table].dependents) {
        inDegree[dependent]--;
        if (inDegree[dependent] === 0) queue.push(dependent);
      }
    }
  }

  return result;
}

export { buildTableDependencyGraph, detectCycle, getTableOrderForOperations };

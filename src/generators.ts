import { openaiClient, OUTPUT_DIR } from './client';
import { ColumnValueGenerator, ColumnValueGeneratorParams, Row } from './types';

import fs from 'fs';
import path from 'path';
import { getTableData } from './helpers';

const generateTimestampBetween = (
  before: Date | null,
  after: Date | null
): ColumnValueGenerator<Date> => {
  const beforeTimestamp = before ? before.getTime() : Date.now();
  const afterTimestamp = after ? after.getTime() : Date.now();
  return (params: ColumnValueGeneratorParams) => {
    return new Date(
      beforeTimestamp + Math.random() * (afterTimestamp - beforeTimestamp)
    );
  };
};

const generateTimestampAfter = (
  columnName: string
): ColumnValueGenerator<Date> => {
  return (params: ColumnValueGeneratorParams) => {
    const targetColValue: Date = params.currentRow[columnName];
    const targetTimestamp = targetColValue.getTime();
    return new Date(
      targetTimestamp + Math.random() * (Date.now() - targetTimestamp)
    );
  };
};

const generateUUID = (): ColumnValueGenerator<string> => {
  return (params: ColumnValueGeneratorParams) => {
    return require('crypto').randomUUID();
  };
};

const returnConstValue = <T>(val: T): ColumnValueGenerator<T> => {
  return (params: ColumnValueGeneratorParams) => {
    return val;
  };
};

const useFaker = <T>(fakerFunc: () => T): ColumnValueGenerator<T> => {
  return (params: ColumnValueGeneratorParams) => {
    return fakerFunc();
  };
};

const selectRandomForeignValue = <T>(
  tableName: string,
  columnName: string
): ColumnValueGenerator<T> => {
  return async (params: ColumnValueGeneratorParams) => {
    const filePath = path.join(OUTPUT_DIR, `${tableName}.json`);
    if (!fs.existsSync(filePath)) {
      if (params.columnSchema.is_nullable == 'NO')
        throw new Error(`File not found: ${filePath}`);
      return null as T;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const tableData = JSON.parse(fileContent);
    if (tableData.length > 0) {
      const randomRow = tableData[Math.floor(Math.random() * tableData.length)];
      return randomRow[columnName] as T;
    } else {
      if (params.columnSchema.is_nullable == 'NO')
        throw new Error(`No rows found in file ${filePath}`);
      return null as T;
    }
  };
};

const generateDataWithContext = async (
  prompt: string,
  context: Record<string, any>
): Promise<string> => {
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are generating realistic test data for a web development agency's project management software.
          Generate data that reflects real client projects, tasks, and communications - like "E-commerce Site for Local Bakery" 
          or "Website Redesign for Smith & Associates Law Firm". Focus on actual project details a web dev shop would track.
          Only return the specific data requested. Do not include any metadata, IDs, timestamps or other context. Please only 
          return the data requested.`,
      },
      {
        role: 'user',
        content: `${prompt} ${JSON.stringify(context)}`,
      },
    ],
    temperature: 0.85,
  });

  if (
    response.choices &&
    response.choices.length > 0 &&
    response.choices[0].message.content
  ) {
    return response.choices[0].message.content.trim();
  } else {
    throw new Error('Failed to generate data using OpenAI.');
  }
};

const generateWithContext = ({
  prompt,
  includeRowContext = false,
  includeTableContext = false,
  foreignRowContext,
}: {
  prompt: string;
  includeRowContext?: boolean;
  includeTableContext?: boolean;
  foreignRowContext?: {
    currentTableColumn: string;
    foreignTableName: string;
    foreignTableColumn: string;
  };
}): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    const context: Record<string, any> = {};

    if (includeRowContext) {
      context['Current Row Data'] = params.currentRow;
    }

    if (includeTableContext) {
      context['Current Table Data'] = params.tableData;
    }

    if (foreignRowContext) {
      const { currentTableColumn, foreignTableName, foreignTableColumn } =
        foreignRowContext;

      const foreignDataPath = `${OUTPUT_DIR}/${foreignTableName}.json`;
      const foreignData = JSON.parse(fs.readFileSync(foreignDataPath, 'utf8'));
      const foreignRow = foreignData.find(
        (row: Record<any, string>) =>
          row[foreignTableColumn] === params.currentRow[currentTableColumn]
      );

      if (!foreignRow) {
        throw new Error(
          `No matching row found in foreign table ${foreignTableName} for column ${foreignTableColumn}`
        );
      }

      context['Foreign Row Data'] = foreignRow;
    }

    return generateDataWithContext(prompt, context);
  };
};

const currentRowValue = (key: string): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    return params.currentRow[key];
  };
};

const foreignRowValue = (key: string): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    if (!params.foreignRow) {
      throw new Error('No foreign row data provided');
    }
    return params.foreignRow[key];
  };
};

const getRandomStateFromProjectId = (
  projectIdColumn: string
): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    const projectId = params.currentRow[projectIdColumn];
    const states: Array<Row> = await getTableData('states');
    const statesForProject = states.filter(
      (state: Row) => state.project_id === projectId
    );
    const randomState =
      statesForProject[Math.floor(Math.random() * statesForProject.length)];
    return randomState.id;
  };
};
const getIssueFromProject = (
  projectIdColumn: string
): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    const projectId = params.currentRow[projectIdColumn];
    const issues: Array<Row> = await getTableData('issues');
    const issuesForProject = issues.filter(
      (issue: Row) => issue.project_id === projectId
    );

    if (issuesForProject.length === 0) {
      throw new Error(`No issues found for project ${projectId}`);
    }

    const randomIssue =
      issuesForProject[Math.floor(Math.random() * issuesForProject.length)];
    return randomIssue.id;
  };
};

const getParentIdByProbability = (
  tableName: string,
  probability: number
): ColumnValueGenerator<string | null> => {
  return async (params: ColumnValueGeneratorParams) => {
    if (Math.random() > probability) {
      return null;
    }

    try {
      const items: Array<Row> = await getTableData(tableName);
      const potentialParents = items.filter(
        (item: Row) =>
          item.id !== params.currentRow.id &&
          !item.parent_id &&
          item.project_id === params.currentRow.project_id
      );

      if (potentialParents.length === 0) {
        return null;
      }

      const randomParent =
        potentialParents[Math.floor(Math.random() * potentialParents.length)];
      return randomParent.id;
    } catch (error) {
      // If the file doesn't exist yet (e.g., when generating issues for the first time),
      // just return null instead of throwing an error
      return null;
    }
  };
};
const STATES = ['Cancelled', 'In Progress', 'Backlog', 'Done', 'Todo'];
const stateNameGenerator = (): ColumnValueGenerator<string> => {
  const projectGeneratedStatesLookup: Record<string, string[]> = {};

  return async (params: ColumnValueGeneratorParams) => {
    const projectId = params.currentRow.project_id;
    if (!projectGeneratedStatesLookup[projectId]) {
      projectGeneratedStatesLookup[projectId] = [];
    }
    const existingStates = projectGeneratedStatesLookup[projectId];
    // return a random state from the STATES array that is not in the existingStates array
    const availableStates = STATES.filter(
      (state) => !existingStates.includes(state)
    );
    return availableStates[Math.floor(Math.random() * availableStates.length)];
  };
};
const LABELS = [
  'Bug',
  'Feature',
  'Task',
  'Story',
  'Epic',
  'Sub-task',
  'Improvement',
  'Documentation',
  'Chore',
  'Test',
  'Release',
];
const labelNameGenerator = (): ColumnValueGenerator<string> => {
  const labelGeneratedNamesLookup: Record<string, string[]> = {};
  return async (params: ColumnValueGeneratorParams) => {
    const projectId = params.currentRow.project_id;
    if (!labelGeneratedNamesLookup[projectId]) {
      labelGeneratedNamesLookup[projectId] = [];
    }
    const existingLabels = labelGeneratedNamesLookup[projectId];
    const availableLabels = LABELS.filter(
      (label) => !existingLabels.includes(label)
    );
    return availableLabels[Math.floor(Math.random() * availableLabels.length)];
  };
};

const getLabelFromProject = (): ColumnValueGenerator<string> => {
  return async (params: ColumnValueGeneratorParams) => {
    const projectId = params.currentRow.project_id;
    const labels: Array<Row> = await getTableData('labels');
    const labelsForProject = labels.filter(
      (label: Row) => label.project_id === projectId
    );

    if (labelsForProject.length === 0) {
      throw new Error(`No labels found for project ${projectId}`);
    }

    return labelsForProject[Math.floor(Math.random() * labelsForProject.length)]
      .id;
  };
};
export {
  currentRowValue,
  foreignRowValue,
  generateTimestampAfter,
  generateTimestampBetween,
  generateUUID,
  generateWithContext,
  getIssueFromProject,
  getLabelFromProject,
  getParentIdByProbability,
  getRandomStateFromProjectId,
  labelNameGenerator,
  LABELS,
  returnConstValue,
  selectRandomForeignValue,
  stateNameGenerator,
  STATES,
  useFaker,
};

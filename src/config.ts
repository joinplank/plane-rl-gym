import { faker } from '@faker-js/faker';
import { DEFAULT_PROPS, ISSUE_PROPS, VIEW_PROPS } from './constants';
import {
  currentRowValue,
  foreignRowValue,
  generateTimestampAfter,
  generateTimestampBetween,
  generateUUID,
  generateWithContext,
  getIssueFromProject,
  getLabelFromProject,
  getParentIdByProbability,
  labelNameGenerator,
  returnConstValue,
  selectRandomForeignValue,
  stateNameGenerator,
  useFaker,
} from './generators';
import { SeedConfig } from './types';

const FIVE_YEARS_AGO = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);

export const seedConfigs: Array<SeedConfig> = [
  //users
  {
    tableName: 'users',
    skip_generate: true,
    skip_import: false,
    columns: {
      password: returnConstValue("pbkdf2_sha256$600000$ZyQJ3pAxPJmxzxCDt0QaJ4$X9xbdm5GHmLcD8v5Z2PZuDtkK92FdzwbVPOeJomqgpk="),
      last_login: returnConstValue("2025-07-23 17:06:26.035817+00"),
      id: returnConstValue("35e052f2-442d-4f9c-a6b7-3ecf67dbdb87"),
      username: returnConstValue("a2cd4ebd46724a10ae9b7cb7dbb1ea39"),
      mobile_number: returnConstValue(null),
      email: returnConstValue("davi@plank.com"),
      first_name: returnConstValue("Davi"),
      last_name: returnConstValue("Lage"),
      avatar: returnConstValue(""),
      date_joined: returnConstValue("2025-07-23 17:06:25.919222+00"),
      created_at: returnConstValue("2025-07-23 17:06:25.919261+00"),
      updated_at: returnConstValue("2025-07-23 17:06:25.998577+00"),
      last_location: returnConstValue(""),
      created_location: returnConstValue(""),
      is_superuser: returnConstValue(false),
      is_managed: returnConstValue(false),
      is_password_expired: returnConstValue(false),
      is_active: returnConstValue(true),
      is_staff: returnConstValue(false),
      is_email_verified: returnConstValue(false),
      is_password_autoset: returnConstValue(false),
      token: returnConstValue("3176dd38a0924d7c83741350ed259d09c5228950dd294b82a30a36dc2b25f7b7"),
      user_timezone: returnConstValue("UTC"),
      last_active: returnConstValue("2025-07-23 17:06:25.997949+00"),
      last_login_time: returnConstValue("2025-07-23 17:06:25.997958+00"),
      last_logout_time: returnConstValue(null),
      last_login_ip: returnConstValue(""),
      last_logout_ip: returnConstValue(""),
      last_login_medium: returnConstValue("email"),
      last_login_uagent: returnConstValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"),
      token_updated_at: returnConstValue("2025-07-23 17:06:25.998107+00"),
      is_bot: returnConstValue(false),
      cover_image: returnConstValue(null),
      display_name: returnConstValue("davi"),
      avatar_asset_id: returnConstValue(null),
      cover_image_asset_id: returnConstValue(null),
      bot_type: returnConstValue(null),
      is_email_valid: returnConstValue(false),
      masked_at: returnConstValue(null)
    }
  },
  //instances
  {
    tableName: 'instances',
    skip_generate: true,
    skip_import: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      role: returnConstValue(20),
      is_verified: returnConstValue(false),
      created_by_id: returnConstValue(null),
      instance_id: returnConstValue("c958bccc-7995-48cb-80fa-4045526d0372"),
      updated_by_id: returnConstValue(null),
      user_id: returnConstValue("86151c5e-2eb7-46d4-9bd9-d60356e4467e"),
      deleted_at: returnConstValue(null)
    },
  },
  //sessions
  {
    tableName: 'sessions',
    skip_generate: true,
    skip_import: false,
    columns: {
      session_data: returnConstValue(".eJxVjjtPwzAUhf-KlamVGseuH0nKBAyASsQAEmyRHzeNqWtHictA1f9OijqA7nbu-T6dU9aqY-rb4wRj62y2ySpJBTUC8jXoMufS8rzWts6tJExI4FyWkK3-YlqZPYQLaz9V2EVsYkij0_hSwdfvhJtowd9du_8EvZr6mdZKd6SWEoArYFSqSlcaOJNQMb4WljDCJClBCmJqS6GzWrMSiKg7XjNNZqmFL2egdaGL2eaU_drVDkKa9U38dt6rQmCCFo0yLqQ49TfoKSTwaA7Qyyv6QJS0VLTlEt0Og4d30FuXCsFKzCRabB_fmucV8m4P6AHMPi7RfT_GAxSUVZhcDr2qTo3uisyb3NAqa0eYpnkELdeY1nOPisvceFAuzHGf0rApCh-N8n2cUnY-_wDU537r:1ueh2R:Jh886d_wyuY8gX4LNfE0X2-ZiTvG9_gBpcOjza6i7Cw"),
      expire_date: returnConstValue("2025-07-30 21:30:11.959443+00"),
      device_info: returnConstValue("{\"domain\": \"http://localhost\", \"ip_address\": \"172.19.0.15\", \"user_agent\": \"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36\"}"),
      session_key: returnConstValue("fyzbcxdg7ss2rpmqsqaq7ty1s3tua05vstv26hlwehp8fe0fr83uoodlf9vkwuq2po5pfguw5qjq0aea6iiqxku6nc0b57jetvyhjiz1ffnwl43cykwml6sarvedxfhj"),
      user_id: returnConstValue("86151c5e-2eb7-46d4-9bd9-d60356e4467e")
    }
  },
  //workspaces
  {
    tableName: 'workspaces',
    rowGeneration: {
      type: 'static',
      count: 1,
    },
    concurrentGeneration: true,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: generateWithContext({
        prompt: 'Generate a short workspace name under 80 characters.',
      }),
      logo: returnConstValue(null),
      slug: generateWithContext({
        includeRowContext: true,
        prompt:
          'Generate a workspace slug under 48 characters based on the name. The slug should be lowercase and words joined by hyphens.',
      }),
      created_by_id: selectRandomForeignValue('users', 'id'),
      owner_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      organization_size: returnConstValue('1-20'),
      deleted_at: returnConstValue(null),
      logo_asset_id: returnConstValue(null),
      timezone: returnConstValue('New York/Eastern'),
    },
  },
  // profiles
  {
    tableName: 'profiles',
    skip_generate: true,
    skip_import: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      theme: returnConstValue("{}"),
      is_tour_completed: returnConstValue(false),
      onboarding_step: returnConstValue("{\"workspace_join\": false, \"profile_complete\": false, \"workspace_create\": false, \"workspace_invite\": false}"),
      use_case: returnConstValue(null),
      role: returnConstValue(null),
      is_onboarded: returnConstValue(false),
      last_workspace_id: returnConstValue(null),
      billing_address_country: returnConstValue("INDIA"),
      billing_address: returnConstValue(null),
      has_billing_address: returnConstValue(false),
      company_name: returnConstValue("plank"),
      user_id: returnConstValue("86151c5e-2eb7-46d4-9bd9-d60356e4467e"),
      is_mobile_onboarded: returnConstValue(false),
      mobile_onboarding_step: returnConstValue("{\"workspace_join\": false, \"profile_complete\": false, \"workspace_create\": false}"),
      mobile_timezone_auto_set: returnConstValue(false),
      language: returnConstValue("en"),
      is_smooth_cursor_enabled: returnConstValue(false),
      start_of_the_week: returnConstValue(0)
    },
  },
  //projects
  {
    tableName: 'projects',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'workspaces',
      foreignColumn: 'id',
      tableColumn: 'workspace_id',
      countPerEntry: {
        min: 10,
        max: 20,
      },
    },
    concurrentGeneration: true,
    primaryKeys: ['name', 'workspace_id'],
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      name: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'workspace_id',
          foreignTableName: 'workspaces',
          foreignTableColumn: 'id',
        },
        includeTableContext: true,
        prompt:
          'Generate a unique project name based on the workspace it exists in. Do not repeat any existing project names within the same workspace. Keep under 255 characters.',
      }),
      description: generateWithContext({
        prompt: 'Come up with a description for the project.',
        includeRowContext: true,
      }),
      description_text: returnConstValue(null),
      description_html: returnConstValue(null),
      network: returnConstValue(0),
      identifier: useFaker(() => faker.string.alphanumeric(12)),
      created_by_id: selectRandomForeignValue('users', 'id'),
      default_assignee_id: selectRandomForeignValue('users', 'id'),
      project_lead_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      emoji: useFaker(faker.internet.emoji),
      cycle_view: returnConstValue(true),
      module_view: returnConstValue(true),
      cover_image: returnConstValue(null),
      issue_views_view: returnConstValue(true),
      page_view: returnConstValue(true),
      estimate_id: selectRandomForeignValue('estimates', 'id'),
      icon_prop: returnConstValue(null),
      intake_view: returnConstValue(false),
      archive_in: returnConstValue(0),
      close_in: returnConstValue(0),
      default_state_id: returnConstValue(null),
      logo_props: returnConstValue(JSON.stringify({})),
      archived_at: returnConstValue(null),
      is_time_tracking_enabled: returnConstValue(false),
      is_issue_type_enabled: returnConstValue(false),
      deleted_at: returnConstValue(null),
      guest_view_all_features: returnConstValue(false),
      timezone: useFaker(faker.location.timeZone),
      cover_image_asset_id: selectRandomForeignValue('file_assets', 'id'),
    },
  },
  //states
  {
    tableName: 'states',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      tableColumn: 'project_id',
      countPerEntry: 3, //STATES.length,
    },
    concurrentGeneration: false,
    primaryKeys: ['name', 'project_id'],
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: stateNameGenerator(),
      description: returnConstValue(''),
      color: useFaker(faker.color.rgb),
      slug: returnConstValue(''),
      created_by_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      sequence: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      group: useFaker(() =>
        faker.helpers.arrayElement([
          'started',
          'completed',
          'backlog',
          'cancelled',
          'unstarted',
        ])
      ),
      default: returnConstValue(true),
      external_id: returnConstValue(null),
      external_source: returnConstValue(null),
      is_triage: returnConstValue(false),
      deleted_at: returnConstValue(null),
    },
  },
  //labels
  {
    tableName: 'labels',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: 3, //LABELS.length,
      tableColumn: 'project_id',
    },
    concurrentGeneration: true,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: labelNameGenerator(),
      description: generateWithContext({
        includeRowContext: true,
        prompt: 'Generate a short description for this label',
      }),
      created_by_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      parent_id: returnConstValue(null),
      color: useFaker(faker.color.rgb),
      sort_order: useFaker(() => faker.number.float({ min: 0, max: 1000 })),
      external_id: returnConstValue(null),
      external_source: returnConstValue(null),
      deleted_at: returnConstValue(null),
    },
  },
  //issues
  {
    tableName: 'issues',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'states',
      foreignColumn: 'id',
      countPerEntry: {
        min: 5,
        max: 10,
      },
      tableColumn: 'state_id',
    },
    concurrentGeneration: true,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      project_id: foreignRowValue('project_id'),
      id: generateUUID(),
      name: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'project_id',
          foreignTableName: 'projects',
          foreignTableColumn: 'id',
        },
        includeTableContext: false,
        prompt:
          'Generate an issue name based on the project it belongs to. Do not repeat existing issues. Keep under 255 characters. Do not wrap the name in quotes.',
      }),
      description: returnConstValue(JSON.stringify({})),
      priority: useFaker(() =>
        faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'])
      ),
      start_date: useFaker(() => faker.date.recent({days: 30})),
      target_date: useFaker(() => faker.date.soon({days: 30})),
      sequence_id: useFaker(() => faker.number.int({ min: 1, max: 1000 })),
      created_by_id: selectRandomForeignValue('users', 'id'),
      parent_id: getParentIdByProbability('issues', 0.5),

      state_id: foreignRowValue('id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      description_html: generateWithContext({
        includeRowContext: true,
        prompt: 'Generate a detailed description for the issue. ',
      }),
      description_stripped: generateWithContext({
        includeRowContext: true,
        prompt: 'Give the description_html but stripped',
      }),
      completed_at: returnConstValue(null),
      sort_order: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      point: useFaker(() => faker.number.int({ min: 1, max: 10 })),
      archived_at: returnConstValue(null),
      is_draft: returnConstValue(false),
      external_id: useFaker(() => faker.string.uuid()),
      external_source: useFaker(() => faker.internet.domainName()),
      description_binary: returnConstValue(null),
      estimate_point_id: selectRandomForeignValue('estimate_points', 'id'),
      type_id: selectRandomForeignValue('issue_types', 'id'),
      deleted_at: returnConstValue(null),
    },
  },
  //cycles
  {
    tableName: 'cycles',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 5 },
      tableColumn: 'project_id',
    },
    concurrentGeneration: true,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'project_id',
          foreignTableName: 'projects',
          foreignTableColumn: 'id',
        },
        includeTableContext: true,
        prompt: `Generate a short cycle name (under 255 characters) based on the project it belongs to. Do not repeat names.
          A Cycle is a set period of time where your team focuses on completing specific tasks or issues, similar to 
          sprints in Agile.
          `,
      }),
      description: generateWithContext({
        includeRowContext: true,
        prompt:
          'Generate a detailed description for the cycle based on its name.',
      }),
      start_date: useFaker(() => faker.date.soon()),
      end_date: useFaker(() => faker.date.future()),
      created_by_id: selectRandomForeignValue('users', 'id'),
      owned_by_id: selectRandomForeignValue('users', 'id'),
      project_id: selectRandomForeignValue('projects', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      view_props: returnConstValue(JSON.stringify(VIEW_PROPS)),
      sort_order: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      external_id: useFaker(() => faker.string.uuid()),
      external_source: useFaker(() => faker.internet.domainName()),
      progress_snapshot: returnConstValue(JSON.stringify({})),
      archived_at: returnConstValue(null),
      logo_props: returnConstValue(JSON.stringify({})),
      deleted_at: returnConstValue(null),
      timezone: useFaker(faker.location.timeZone),
      version: useFaker(() => faker.number.int({ min: 1, max: 10 })),
    },
  },
  //modules
  {
    tableName: 'modules',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 3 },
      tableColumn: 'project_id',
    },
    primaryKeys: ['name', 'project_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'project_id',
          foreignTableName: 'projects',
          foreignTableColumn: 'id',
        },
        includeTableContext: true,
        prompt:
          'Generate exactly one short, unique module name (under 255 characters) based on the project it belongs to',
      }),
      description: generateWithContext({
        includeRowContext: true,
        prompt: 'Generate a brief description for the module based on its name',
      }),
      description_text: returnConstValue(null),
      description_html: returnConstValue(null),
      start_date: useFaker(() => faker.date.soon()),
      target_date: useFaker(() => faker.date.future()),
      status: useFaker(() =>
        faker.helpers.arrayElement([
          'backlog',
          'planned',
          'in_progress',
          'paused',
          'completed',
          'cancelled',
        ])
      ),
      created_by_id: selectRandomForeignValue('users', 'id'),
      lead_id: selectRandomForeignValue('users', 'id'),
      project_id: selectRandomForeignValue('projects', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      view_props: returnConstValue(JSON.stringify({})),
      sort_order: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      external_id: returnConstValue(null),
      external_source: returnConstValue(null),
      archived_at: returnConstValue(null),
      logo_props: returnConstValue(JSON.stringify({})),
      deleted_at: returnConstValue(null),
    },
  },
  //pages
  {
    tableName: 'pages',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'workspaces',
      foreignColumn: 'id',
      tableColumn: 'workspace_id',
      countPerEntry: {
        min: 5,
        max: 10,
      },
    },
    concurrentGeneration: false,
    primaryKeys: ['id'],
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'workspace_id',
          foreignTableName: 'workspaces',
          foreignTableColumn: 'id',
        },
        prompt: 'Generate a page name based on the workspace it exists in. ',
      }),
      description_stripped: generateWithContext({
        prompt: 'Come up with a description for the page.',
        includeRowContext: true,
      }),
      description_html: generateWithContext({
        prompt:
          'Format the description_stripped text as: <p class="editor-paragraph-block">{description_stripped}</p><p class="editor-paragraph-block"></p><p class="editor-paragraph-block"></p>',
        includeRowContext: true,
      }),
      description: generateWithContext({
        prompt:
          'Generate a JSON string with format: {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"text": {description_stripped}, "type": "text"}]}, {"type": "paragraph", "attrs": {"textAlign": null}}, {"type": "paragraph", "attrs": {"textAlign": null}}]}',
        includeRowContext: true,
      }),
      access: returnConstValue(0),
      created_by_id: selectRandomForeignValue('users', 'id'),
      owned_by_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      color: returnConstValue(''),
      archived_at: returnConstValue(null),
      is_locked: returnConstValue(false),
      parent_id: returnConstValue(null),
      view_props: returnConstValue(JSON.stringify({})),
      logo_props: returnConstValue(JSON.stringify({})),
      description_binary: returnConstValue(null),
      is_global: returnConstValue(false),
      deleted_at: returnConstValue(null),
    },
  },
  //workspace_members
  {
    tableName: 'workspace_members',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'users',
      foreignColumn: 'id',
      countPerEntry: 1,
      tableColumn: 'created_by_id',
    },
    primaryKeys: ['workspace_id', 'member_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      role: returnConstValue(20),
      member_id: currentRowValue('created_by_id'),
      updated_by_id: currentRowValue('created_by_id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      company_role: returnConstValue(null),
      view_props: returnConstValue(JSON.stringify(VIEW_PROPS)),
      default_props: returnConstValue(JSON.stringify(DEFAULT_PROPS)),
      issue_props: returnConstValue(JSON.stringify(ISSUE_PROPS)),
      is_active: returnConstValue(1),
      deleted_at: returnConstValue(null),
    },
  },
  //project_members
  {
    tableName: 'project_members',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 2 },
      tableColumn: 'project_id',
    },
    primaryKeys: ['project_id', 'member_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      comment: returnConstValue(null),
      role: returnConstValue(20),
      created_by_id: selectRandomForeignValue('users', 'id'),
      member_id: currentRowValue('created_by_id'),
      project_id: foreignRowValue('id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      view_props: returnConstValue(JSON.stringify(VIEW_PROPS)),
      default_props: returnConstValue(JSON.stringify(DEFAULT_PROPS)),
      sort_order: returnConstValue(0),
      preferences: returnConstValue(JSON.stringify({})),
      is_active: returnConstValue(true),
      deleted_at: returnConstValue(null),
    },
  },
  // issue_labels
  {
    tableName: 'issue_labels',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'issues',
      foreignColumn: 'id',
      countPerEntry: { min: 0, max: 3 },
      tableColumn: 'issue_id',
    },
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      project_id: foreignRowValue('project_id'),
      created_by_id: selectRandomForeignValue('users', 'id'),
      issue_id: getIssueFromProject('project_id'),
      label_id: getLabelFromProject(),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      deleted_at: returnConstValue(null),
    },
  },
  //issue_assignees
  {
    tableName: 'issue_assignees',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'issues',
      foreignColumn: 'id',
      countPerEntry: 1,
      tableColumn: 'issue_id',
    },
    primaryKeys: ['issue_id', 'assignee_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      assignee_id: selectRandomForeignValue('users', 'id'),
      created_by_id: selectRandomForeignValue('users', 'id'),
      issue_id: selectRandomForeignValue('issues', 'id'),
      project_id: foreignRowValue('project_id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      deleted_at: returnConstValue(null),
    },
  },
  //module_members
  {
    tableName: 'module_members',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'modules',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 2 },
      tableColumn: 'module_id',
    },
    primaryKeys: ['member_id', 'module_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      created_by_id: selectRandomForeignValue('users', 'id'),
      member_id: selectRandomForeignValue('users', 'id'),
      module_id: selectRandomForeignValue('modules', 'id'),
      project_id: selectRandomForeignValue('projects', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      deleted_at: returnConstValue(null),
    },
  },
  //project_pages
  {
    tableName: 'project_pages',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 5 },
      tableColumn: 'project_id',
    },
    primaryKeys: ['project_id', 'page_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      created_by_id: selectRandomForeignValue('users', 'id'),
      page_id: selectRandomForeignValue('pages', 'id'),
      project_id: foreignRowValue('id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      deleted_at: returnConstValue(null),
    },
  },
  //cycle_issues
  {
    tableName: 'cycle_issues',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'cycles',
      foreignColumn: 'id',
      countPerEntry: { min: 10, max: 15 },
      tableColumn: 'cycle_id',
    },
    primaryKeys: ['cycle_id', 'issue_id'],
    concurrentGeneration: true,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      created_by_id: selectRandomForeignValue('users', 'id'),
      project_id: foreignRowValue('project_id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      issue_id: getIssueFromProject('project_id'),
      deleted_at: returnConstValue(null),
    },
  },
  //instance_admins
  {
    tableName: 'instance_admins',
    skip_generate: true,
    skip_import: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      role: returnConstValue(20),
      is_verified: returnConstValue(false),
      created_by_id: returnConstValue(null),
      instance_id: returnConstValue("c958bccc-7995-48cb-80fa-4045526d0372"),
      updated_by_id: returnConstValue(null),
      user_id: returnConstValue("86151c5e-2eb7-46d4-9bd9-d60356e4467e"),
      deleted_at: returnConstValue(null)
    },
  },
  //instance_configurations
  {
    tableName: 'instance_configurations',
    skip_generate: true,
    skip_import: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      key: returnConstValue("GITLAB_CLIENT_SECRET"),
      value: returnConstValue(""),
      category: returnConstValue("GITLAB"),
      is_encrypted: returnConstValue(true),
      created_by_id: returnConstValue(null),
      updated_by_id: returnConstValue(null),
      deleted_at: returnConstValue(null)
    },
  },
  //user_notification_preferences
  {
    tableName: 'user_notification_preferences',
    skip_generate: true,
    skip_import: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      property_change: returnConstValue(false),
      state_change: returnConstValue(false),
      comment: returnConstValue(false),
      mention: returnConstValue(false),
      issue_completed: returnConstValue(false),
      created_by_id: returnConstValue(null),
      project_id: returnConstValue(null),
      updated_by_id: returnConstValue(null),
      user_id: returnConstValue("86151c5e-2eb7-46d4-9bd9-d60356e4467e"),
      workspace_id: returnConstValue(null),
      deleted_at: returnConstValue(null)
    },
  },
  //workspace_member_invites
  {
    tableName: 'workspace_member_invites',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'workspaces',
      foreignColumn: 'id',
      countPerEntry: 1,
      tableColumn: 'workspace_id',
    },
    primaryKeys: ['id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      email: useFaker(() => faker.internet.email()),
      accepted: returnConstValue(true),
      token: useFaker(() => faker.string.alphanumeric(32)),
      message: returnConstValue(''),
      responded_at: returnConstValue(null),
      role: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      created_by_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: currentRowValue('created_by_id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      deleted_at: returnConstValue(null),
    },
  },
  //issue_views
  {
    tableName: 'issue_views',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'projects',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 2 },
      tableColumn: 'project_id',
    },
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      name: generateWithContext({
        includeRowContext: true,
        prompt: `Generate a name for the issue view, maximum 255 characters.
        Views are saved collections of filters that you can apply to work items, allowing you to analyze and manage them efficiently. Instead of reapplying the same filters repeatedly, you can save them with a title for easy access and reuse.
        The name should be a short, descriptive title that helps you identify the purpose of the view.
        `,
      }),
      description: generateWithContext({
        includeRowContext: true,
        prompt: 'Generate a description for the issue view.',
      }),
      query: returnConstValue(JSON.stringify({})),
      access: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      filters: returnConstValue(JSON.stringify({})),
      created_by_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      display_filters: returnConstValue(
        JSON.stringify(VIEW_PROPS.display_filters)
      ),
      display_properties: returnConstValue(
        JSON.stringify(VIEW_PROPS.display_properties)
      ),
      sort_order: useFaker(() => faker.number.int({ min: 0, max: 100 })),
      logo_props: returnConstValue(JSON.stringify({})),
      is_locked: returnConstValue(false),
      owned_by_id: selectRandomForeignValue('users', 'id'),
      deleted_at: returnConstValue(null),
    },
  },
  //issue_activities
  {
    tableName: 'issue_activities',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'issues',
      foreignColumn: 'id',
      countPerEntry: { min: 0, max: 1 },
      tableColumn: 'issue_id',
    },
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      verb: returnConstValue('created'),
      field: returnConstValue('assignees'),
      old_value: returnConstValue(null),
      new_value: returnConstValue(null),
      comment: generateWithContext({
        foreignRowContext: {
          currentTableColumn: 'issue_id',
          foreignTableName: 'issues',
          foreignTableColumn: 'id',
        },
        includeTableContext: true,
        prompt: 'Generate a comment for the issue activity.',
      }),
      attachments: returnConstValue(JSON.stringify({})),
      created_by_id: selectRandomForeignValue('users', 'id'),
      issue_id: selectRandomForeignValue('issues', 'id'),
      issue_comment_id: returnConstValue(null),
      project_id: selectRandomForeignValue('projects', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: selectRandomForeignValue('workspaces', 'id'),
      actor_id: selectRandomForeignValue('users', 'id'),
      new_identifier: returnConstValue(null),
      old_identifier: returnConstValue(null),
      epoch: useFaker(() => faker.number.int({ min: 1, max: 1000000 })),
      deleted_at: returnConstValue(null),
    },
  },
  //issue_subscribers
  {
    tableName: 'issue_subscribers',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'issues',
      foreignColumn: 'id',
      countPerEntry: { min: 1, max: 2 },
      tableColumn: 'issue_id',
    },
    primaryKeys: ['issue_id', 'subscriber_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      created_by_id: selectRandomForeignValue('users', 'id'),
      project_id: selectRandomForeignValue('projects', 'id'),
      subscriber_id: selectRandomForeignValue('users', 'id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      deleted_at: returnConstValue(null),
    },
  },
  //module_issues
  {
    tableName: 'module_issues',
    rowGeneration: {
      type: 'foreignTable',
      tableName: 'modules',
      foreignColumn: 'id',
      countPerEntry: {
        min: 10,
        max: 15,
      },
      tableColumn: 'module_id',
    },
    primaryKeys: ['module_id', 'issue_id'],
    concurrentGeneration: false,
    columns: {
      created_at: generateTimestampBetween(FIVE_YEARS_AGO, new Date()),
      updated_at: generateTimestampAfter('created_at'),
      id: generateUUID(),
      created_by_id: selectRandomForeignValue('users', 'id'),
      project_id: foreignRowValue('project_id'),
      issue_id: getIssueFromProject('project_id'),
      updated_by_id: selectRandomForeignValue('users', 'id'),
      workspace_id: foreignRowValue('workspace_id'),
      deleted_at: returnConstValue(null),
    },
  },
];

export const INSERT_ORDER = [
  "users", // <--- Not to be generated
  "instances", // <--- Not to be generated
  "sessions", // <--- Not to be generated
  'workspaces', // <---
  "profiles", // <--- Not to be generated
  'projects', // <---
  'states', // <---
  'labels', // <---
  'issues', // <---
  'cycles', // <---
  'modules', // <---
  'pages', // <---
  // "notifications",
  'workspace_members', // <---
  'project_members', // <---
  // "issue_labels", // <---
  'issue_assignees', // <---
  'module_members', // <---
  // "page_versions",
  // "project_identifiers",
  'project_pages', // <---
  'cycle_issues', // <---
  "instance_admins", // <--- Not to be generated
  "instance_configurations", // <--- Not to be generated
  "user_notification_preferences", // <--- Not to be generated
  // "user_recent_visits",
  // "workspace_home_preferences",
  'workspace_member_invites', // <---
  // "workspace_user_preferences",
  'issue_views', // <---
  'issue_activities', // <---
  // "issue_sequences",
  // "issue_user_properties",
  'issue_subscribers', // <---
  // "issue_description_versions",
  'module_issues', // <---
  // "module_user_properties"
  'transaction_log', // <--- Not to be generated or imported
];

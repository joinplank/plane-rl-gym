/**
 * Database table insertion order for data generation and CDC monitoring
 * This file contains only the table order without any OpenAI dependencies
 */

export const INSERT_ORDER = [
  'workspaces',
  'projects',
  'states',
  'labels',
  'issues',
  'cycles',
  'modules',
  'pages',
  'workspace_members',
  'project_members',
  'issue_assignees',
  'module_members',
  'project_pages',
  'cycle_issues',
  'workspace_member_invites',
  'issue_views',
  'issue_activities',
  'issue_subscribers',
  'module_issues',
]; 
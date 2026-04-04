export const DEFAULT_PROJECT_STATUS_DEFINITIONS = [
  {
    key: 'todo',
    name: 'Todo',
    position: 1,
    isClosed: false,
    color: 'SLATE',
  },
  {
    key: 'in-progress',
    name: 'In Progress',
    position: 2,
    isClosed: false,
    color: 'BLUE',
  },
  {
    key: 'done',
    name: 'Done',
    position: 3,
    isClosed: true,
    color: 'GREEN',
  },
] as const;

export const DEFAULT_PROJECT_STATUS_DEFINITIONS = [
  {
    key: 'todo',
    name: 'Todo',
    position: 1,
    isClosed: false,
  },
  {
    key: 'in-progress',
    name: 'In Progress',
    position: 2,
    isClosed: false,
  },
  {
    key: 'done',
    name: 'Done',
    position: 3,
    isClosed: true,
  },
] as const;

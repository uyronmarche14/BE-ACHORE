import { TaskStatus } from '@prisma/client';

type BoardTaskRecord = {
  status: TaskStatus;
  position: number | null;
  createdAt: Date;
};

export type TaskGroupRecords<TTask extends BoardTaskRecord> = Record<
  TaskStatus,
  TTask[]
>;

export function createEmptyTaskGroupRecords<
  TTask extends BoardTaskRecord,
>(): TaskGroupRecords<TTask> {
  return {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
}

export function groupTaskRecordsByStatus<TTask extends BoardTaskRecord>(
  tasks: TTask[],
): TaskGroupRecords<TTask> {
  const taskGroups = createEmptyTaskGroupRecords<TTask>();

  for (const task of [...tasks].sort(compareTaskRecordsForBoard)) {
    taskGroups[task.status].push(task);
  }

  return taskGroups;
}

function compareTaskRecordsForBoard<TTask extends BoardTaskRecord>(
  left: TTask,
  right: TTask,
) {
  if (left.position !== null && right.position !== null) {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
  } else if (left.position !== null) {
    return -1;
  } else if (right.position !== null) {
    return 1;
  }

  return left.createdAt.getTime() - right.createdAt.getTime();
}

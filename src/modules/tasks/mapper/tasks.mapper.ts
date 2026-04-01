import type {
  DeleteTaskResponse,
  ProjectTasksResponse,
  TaskGroupRecords,
  TaskRecord,
  TaskResponse,
  TaskGroupsResponse,
} from '../types/task-response.type';

export function mapTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    position: task.position,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function mapDeleteTaskResponse(): DeleteTaskResponse {
  return {
    message: 'Task deleted successfully',
  };
}

export function mapProjectTasksResponse(
  taskGroups: TaskGroupRecords,
): ProjectTasksResponse {
  const responseTaskGroups = createEmptyTaskGroupsResponse();

  for (const status of TASK_STATUSES) {
    responseTaskGroups[status] = taskGroups[status].map((task) =>
      mapTaskResponse(task),
    );
  }

  return {
    taskGroups: responseTaskGroups,
  };
}

function createEmptyTaskGroupsResponse(): TaskGroupsResponse {
  return {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
}

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

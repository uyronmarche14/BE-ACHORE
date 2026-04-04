import type {
  DeleteTaskResponse,
  ProjectTaskStatusRecord,
  ProjectTasksResponse,
  TaskRecord,
  TaskResponse,
  TaskStatusRecord,
} from '../types/task-response.type';

export function mapTaskStatusResponse(status: TaskStatusRecord) {
  return {
    id: status.id,
    name: status.name,
    position: status.position,
    isClosed: status.isClosed,
  };
}

export function mapTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    statusId: task.statusId,
    status: mapTaskStatusResponse(task.status),
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
  statuses: ProjectTaskStatusRecord[],
): ProjectTasksResponse {
  return {
    statuses: statuses.map((status) => ({
      id: status.id,
      name: status.name,
      position: status.position,
      isClosed: status.isClosed,
      tasks: status.tasks.map((task) => mapTaskResponse(task)),
    })),
  };
}

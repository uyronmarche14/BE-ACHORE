import type {
  DeleteTaskResponse,
  TaskRecord,
  TaskResponse,
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

import type {
  DeleteTaskResponse,
  ProjectTaskStatusRecord,
  ProjectTasksResponse,
  TaskChecklistItemRecord,
  TaskChecklistItemResponse,
  TaskLinkRecord,
  TaskLinkResponse,
  TaskRecord,
  TaskResponse,
  TaskSubtaskRecord,
  TaskSubtaskResponse,
  TaskStatusRecord,
} from '../types/task-response.type';

export function mapTaskStatusResponse(status: TaskStatusRecord) {
  return {
    id: status.id,
    name: status.name,
    position: status.position,
    isClosed: status.isClosed,
    color: status.color,
  };
}

export function mapTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    notes: task.notes,
    parentTaskId: task.parentTaskId,
    statusId: task.statusId,
    status: mapTaskStatusResponse(task.status),
    position: task.position,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    links: (task.links ?? []).map((link) => mapTaskLinkResponse(link)),
    checklistItems: (task.checklistItems ?? []).map((item) =>
      mapTaskChecklistItemResponse(item),
    ),
    subtasks: (task.subtasks ?? []).map((subtask) =>
      mapTaskSubtaskResponse(subtask),
    ),
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
      color: status.color,
      tasks: (status.tasks ?? []).map((task) => mapTaskResponse(task)),
    })),
  };
}

function mapTaskLinkResponse(link: TaskLinkRecord): TaskLinkResponse {
  return {
    id: link.id,
    label: link.label,
    url: link.url,
    position: link.position,
  };
}

function mapTaskChecklistItemResponse(
  item: TaskChecklistItemRecord,
): TaskChecklistItemResponse {
  return {
    id: item.id,
    label: item.label,
    isCompleted: item.isCompleted,
    position: item.position,
  };
}

function mapTaskSubtaskResponse(
  subtask: TaskSubtaskRecord,
): TaskSubtaskResponse {
  return {
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    statusId: subtask.statusId,
    status: mapTaskStatusResponse(subtask.status),
    assigneeId: subtask.assigneeId,
    dueDate: subtask.dueDate
      ? subtask.dueDate.toISOString().slice(0, 10)
      : null,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

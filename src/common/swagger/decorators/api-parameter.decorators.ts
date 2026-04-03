import { applyDecorators } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

export function ApiProjectIdParam() {
  return applyDecorators(
    ApiParam({
      name: 'projectId',
      type: String,
      description: 'Project identifier.',
      example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
    }),
  );
}

export function ApiTaskIdParam() {
  return applyDecorators(
    ApiParam({
      name: 'taskId',
      type: String,
      description: 'Task identifier.',
      example: 'task_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
    }),
  );
}

export function ApiInviteTokenParam() {
  return applyDecorators(
    ApiParam({
      name: 'token',
      type: String,
      description: 'Opaque invite or verification token.',
      example: '4b8dba9f79924ddb8f9d0af5f5b7d361',
    }),
  );
}

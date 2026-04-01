import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { CreateTaskDto } from './create-task.dto';

describe('CreateTaskDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateTaskDto,
    data: undefined,
  };

  it('accepts a valid create task payload and normalizes whitespace', async () => {
    await expect(
      validationPipe.transform(
        {
          title: '  Ship    launch checklist  ',
          description: '  Final review before launch  ',
          status: TaskStatus.IN_PROGRESS,
          assigneeId: '  user-2  ',
          dueDate: '2026-04-15',
        },
        metadata,
      ),
    ).resolves.toEqual({
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.IN_PROGRESS,
      assigneeId: 'user-2',
      dueDate: '2026-04-15',
    });
  });

  it('rejects blank titles, invalid status values, and unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          title: '   ',
          status: 'LATER',
          extra: 'field',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { UpdateTaskStatusDto } from './update-task-status.dto';

describe('UpdateTaskStatusDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateTaskStatusDto,
    data: undefined,
  };

  it('accepts valid status updates and allows nullable position', async () => {
    await expect(
      validationPipe.transform(
        {
          status: TaskStatus.IN_PROGRESS,
          position: null,
        },
        metadata,
      ),
    ).resolves.toEqual({
      status: TaskStatus.IN_PROGRESS,
      position: null,
    });
  });

  it('rejects invalid status values and non-positive positions', async () => {
    await expect(
      validationPipe.transform(
        {
          status: 'LATER',
          position: 0,
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
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
          statusId: 'status-in-progress',
          position: null,
        },
        metadata,
      ),
    ).resolves.toEqual({
      statusId: 'status-in-progress',
      position: null,
    });
  });

  it('rejects blank status ids and non-positive positions', async () => {
    await expect(
      validationPipe.transform(
        {
          statusId: '   ',
          position: 0,
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

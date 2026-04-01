import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { UpdateTaskDto } from './update-task.dto';

describe('UpdateTaskDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateTaskDto,
    data: undefined,
  };

  it('accepts valid updates and allows nullable clearing fields', async () => {
    await expect(
      validationPipe.transform(
        {
          title: '  Polish   release notes  ',
          description: null,
          assigneeId: null,
          dueDate: null,
        },
        metadata,
      ),
    ).resolves.toEqual({
      title: 'Polish release notes',
      description: null,
      assigneeId: null,
      dueDate: null,
    });
  });

  it('rejects empty updates and disallowed status or position fields', async () => {
    await expect(validationPipe.transform({}, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(
      validationPipe.transform(
        {
          title: 'Valid title',
          status: 'DONE',
          position: 2,
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

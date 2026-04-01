import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { UpdateProjectDto } from './update-project.dto';

describe('UpdateProjectDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateProjectDto,
    data: undefined,
  };

  it('accepts a valid project update payload and allows null descriptions', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '  Launch    Website  ',
          description: null,
        },
        metadata,
      ),
    ).resolves.toEqual({
      name: 'Launch Website',
      description: null,
    });
  });

  it('rejects empty update payloads and unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          extra: 'field',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateProjectDto,
    data: undefined,
  };

  it('accepts a valid create project payload', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '  Launch    Website  ',
          description: '  Track launch tasks  ',
        },
        metadata,
      ),
    ).resolves.toEqual({
      name: 'Launch Website',
      description: 'Track launch tasks',
    });
  });

  it('rejects blank names, null descriptions, and unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '   ',
          description: null,
          extra: 'field',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { CreateTaskAttachmentDto } from './create-task-attachment.dto';

describe('CreateTaskAttachmentDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateTaskAttachmentDto,
    data: undefined,
  };

  it('accepts valid http and https attachment URLs', async () => {
    await expect(
      validationPipe.transform(
        {
          label: 'Launch brief',
          fileName: 'launch-brief.pdf',
          url: 'https://example.com/files/launch-brief.pdf',
        },
        metadata,
      ),
    ).resolves.toEqual({
      label: 'Launch brief',
      fileName: 'launch-brief.pdf',
      url: 'https://example.com/files/launch-brief.pdf',
    });

    await expect(
      validationPipe.transform(
        {
          label: 'Release notes',
          fileName: 'release-notes.html',
          url: 'http://example.com/release-notes',
        },
        metadata,
      ),
    ).resolves.toEqual({
      label: 'Release notes',
      fileName: 'release-notes.html',
      url: 'http://example.com/release-notes',
    });
  });

  it('rejects unsafe attachment URL schemes and credential-bearing URLs', async () => {
    await expect(
      validationPipe.transform(
        {
          label: 'Bad link',
          fileName: 'bad-link.txt',
          url: 'javascript:alert(1)',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      validationPipe.transform(
        {
          label: 'Bad link',
          fileName: 'bad-link.txt',
          url: 'data:text/plain,hello',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      validationPipe.transform(
        {
          label: 'Bad link',
          fileName: 'bad-link.txt',
          url: 'file:///tmp/private.txt',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      validationPipe.transform(
        {
          label: 'Bad link',
          fileName: 'bad-link.txt',
          url: 'https://user:pass@example.com/secret',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

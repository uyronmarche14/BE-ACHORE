import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { LoginDto } from './login.dto';

describe('LoginDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: LoginDto,
    data: undefined,
  };

  it('accepts a valid login payload', async () => {
    await expect(
      validationPipe.transform(
        {
          email: 'Jane@example.com',
          password: 'StrongPass1',
        },
        metadata,
      ),
    ).resolves.toEqual({
      email: 'jane@example.com',
      password: 'StrongPass1',
    });
  });

  it('rejects malformed email, blank password, and unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          email: 'not-an-email',
          password: '',
          extra: 'field',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

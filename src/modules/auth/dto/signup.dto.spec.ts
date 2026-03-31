import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../common/pipes/global-validation.pipe';
import { SignupDto } from './signup.dto';

describe('SignupDto validation', () => {
  const validationPipe = createGlobalValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: SignupDto,
    data: undefined,
  };

  it('accepts a valid signup payload', async () => {
    await expect(
      validationPipe.transform(
        {
          name: 'Jane Doe',
          email: 'Jane@example.com',
          password: 'StrongPass1',
        },
        metadata,
      ),
    ).resolves.toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'StrongPass1',
    });
  });

  it('rejects blank name, malformed email, weak password, and unknown fields', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '   ',
          email: 'not-an-email',
          password: 'weak',
          extra: 'field',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

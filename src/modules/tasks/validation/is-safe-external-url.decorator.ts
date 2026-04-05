import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsSafeExternalUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isSafeExternalUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          try {
            const parsedUrl = new URL(value);

            if (
              parsedUrl.protocol !== 'http:' &&
              parsedUrl.protocol !== 'https:'
            ) {
              return false;
            }

            return !parsedUrl.username && !parsedUrl.password;
          } catch {
            return false;
          }
        },
        defaultMessage(args?: ValidationArguments) {
          return `${args?.property ?? 'url'} must be an http or https URL without embedded credentials`;
        },
      },
    });
  };
}

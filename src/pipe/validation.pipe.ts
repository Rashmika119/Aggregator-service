import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export function createValidationPipe(): ValidationPipe {
  const opts: ValidationPipeOptions = {
    whitelist: false,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
  };
  return new ValidationPipe(opts);
}
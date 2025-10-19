import { NestFactory } from '@nestjs/core';
import { AppModule } from './aggregator.module';
import { createValidationPipe } from './pipe/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(createValidationPipe());
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();

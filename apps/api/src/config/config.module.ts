import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { loadEnv } from './env';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [() => loadEnv()],
      ignoreEnvFile: false,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

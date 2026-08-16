import { Global, Module } from '@nestjs/common';
import { ClockPort } from './application/ports/clock.port';
import { IdGeneratorPort } from './application/ports/id-generator.port';
import { SystemClock } from './infrastructure/system-clock';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator';

@Global()
@Module({
  providers: [
    { provide: ClockPort, useClass: SystemClock },
    { provide: IdGeneratorPort, useClass: UuidIdGenerator },
  ],
  exports: [ClockPort, IdGeneratorPort],
})
export class SharedModule {}

import { Global, Module } from '@nestjs/common';
import { OpenwaService } from './openwa.service';

@Global()
@Module({
  providers: [OpenwaService],
  exports: [OpenwaService],
})
export class OpenwaModule {}

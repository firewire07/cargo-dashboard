import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      maxRedirects: 0,
    }),
  ],
  controllers: [CapacityController],
  providers: [CapacityService],
})
export class CapacityModule {}

import { Module } from '@nestjs/common';
import { CapacityModule } from './capacity/capacity.module';

@Module({
  imports: [CapacityModule],
})
export class AppModule {}

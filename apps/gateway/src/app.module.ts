import { Module } from '@nestjs/common';
import { FlightsModule } from './flights/flights.module';
import { CapacityModule } from './capacity/capacity.module';

@Module({
  imports: [FlightsModule, CapacityModule]
})
export class AppModule {}

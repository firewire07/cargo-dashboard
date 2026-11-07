import { Controller, Get } from '@nestjs/common';
import { CapacityService } from './capacity.service';

@Controller('capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get('summary')
  getSummary() {
    return this.capacityService.getSummary();
  }
}
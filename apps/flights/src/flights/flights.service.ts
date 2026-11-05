import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Flight, FlightDocument } from './schemas/flight.schema';

@Injectable()
export class FlightsService {
  constructor(
    @InjectModel(Flight.name) private readonly flightModel: Model<FlightDocument>,
  ) {}

  findAll() {
    return this.flightModel.find().sort({ departureAt: 1 }).exec();
  }
}
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FlightDocument = HydratedDocument<Flight>;

@Schema({ timestamps: true })
export class Flight {
  @Prop({ required: true })
  flightNumber: string;

  @Prop({ required: true })
  origin: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ required: true })
  departureAt: Date;

  @Prop({ required: true, min: 0 })
  capacityKg: number;

  @Prop({ required: true, min: 0 })
  bookedKg: number;

  @Prop({ required: true, min: 0 })
  revenueUsd: number;
}

export const FlightSchema = SchemaFactory.createForClass(Flight);
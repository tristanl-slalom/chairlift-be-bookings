import { z } from 'zod';

// Booking status enum
export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CANCELLED: 'CANCELLED'
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

// Cabin class enum
export const CabinClass = {
  ECONOMY: 'economy',
  BUSINESS: 'business',
  FIRST: 'first'
} as const;

export type CabinClass = typeof CabinClass[keyof typeof CabinClass];

// Payment status enum
export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

// Passenger schema
export const PassengerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  seatNumber: z.string().optional(),
  cabinClass: z.enum(['economy', 'business', 'first'])
});

export type Passenger = z.infer<typeof PassengerSchema>;

// Pricing schema
export const PricingSchema = z.object({
  baseFare: z.number().positive(),
  taxes: z.number().nonnegative(),
  total: z.number().positive()
});

export type Pricing = z.infer<typeof PricingSchema>;

// Payment schema
export const PaymentSchema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'])
});

export type Payment = z.infer<typeof PaymentSchema>;

// Create booking input schema
export const CreateBookingSchema = z.object({
  customerId: z.string().uuid(),
  flightId: z.string().uuid(),
  passengers: z.array(PassengerSchema).min(1).max(10),
  pricing: PricingSchema,
  payment: PaymentSchema
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// Update booking input schema
export const UpdateBookingSchema = z.object({
  passengers: z.array(PassengerSchema).min(1).max(10).optional(),
  pricing: PricingSchema.optional(),
  payment: PaymentSchema.optional()
});

export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;

// Booking interface
export interface Booking {
  bookingId: string;
  confirmationCode: string;
  customerId: string;
  flightId: string;
  passengers: Passenger[];
  pricing: Pricing;
  payment: Payment;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

// DynamoDB booking interface
export interface DynamoDBBooking {
  PK: string;                // BOOKING#{bookingId}
  SK: string;                // METADATA
  GSI1PK: string;           // CUSTOMER#{customerId}
  GSI1SK: string;           // CREATED#{timestamp}
  GSI2PK: string;           // FLIGHT#{flightId}
  GSI2SK: string;           // BOOKING#{bookingId}
  GSI3PK: string;           // STATUS#{status}
  GSI3SK: string;           // CREATED#{timestamp}
  GSI4PK: string;           // CONFIRMATION#{code}
  GSI4SK: string;           // BOOKING#{bookingId}
  bookingId: string;
  confirmationCode: string;
  customerId: string;
  flightId: string;
  passengers: Passenger[];
  pricing: Pricing;
  payment: Payment;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

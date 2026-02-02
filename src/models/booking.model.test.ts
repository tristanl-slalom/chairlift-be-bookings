import { CreateBookingSchema, PassengerSchema, PricingSchema, PaymentSchema } from './booking.model';

describe('booking.model', () => {
  describe('PassengerSchema', () => {
    it('should validate a valid passenger', () => {
      const passenger = {
        firstName: 'John',
        lastName: 'Doe',
        cabinClass: 'economy' as const
      };

      expect(() => PassengerSchema.parse(passenger)).not.toThrow();
    });

    it('should reject invalid cabin class', () => {
      const passenger = {
        firstName: 'John',
        lastName: 'Doe',
        cabinClass: 'premium'
      };

      expect(() => PassengerSchema.parse(passenger)).toThrow();
    });
  });

  describe('PricingSchema', () => {
    it('should validate valid pricing', () => {
      const pricing = {
        baseFare: 299.99,
        taxes: 45.00,
        total: 344.99
      };

      expect(() => PricingSchema.parse(pricing)).not.toThrow();
    });

    it('should reject negative values', () => {
      const pricing = {
        baseFare: -299.99,
        taxes: 45.00,
        total: 344.99
      };

      expect(() => PricingSchema.parse(pricing)).toThrow();
    });
  });

  describe('PaymentSchema', () => {
    it('should validate valid payment', () => {
      const payment = {
        transactionId: 'txn_123456',
        status: 'COMPLETED' as const
      };

      expect(() => PaymentSchema.parse(payment)).not.toThrow();
    });
  });

  describe('CreateBookingSchema', () => {
    it('should validate a valid booking', () => {
      const booking = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            cabinClass: 'economy' as const
          }
        ],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED' as const
        }
      };

      expect(() => CreateBookingSchema.parse(booking)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const booking = {
        customerId: 'not-a-uuid',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            cabinClass: 'economy' as const
          }
        ],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED' as const
        }
      };

      expect(() => CreateBookingSchema.parse(booking)).toThrow();
    });

    it('should reject empty passengers array', () => {
      const booking = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED' as const
        }
      };

      expect(() => CreateBookingSchema.parse(booking)).toThrow();
    });

    it('should reject more than 10 passengers', () => {
      const booking = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: Array(11).fill({
          firstName: 'John',
          lastName: 'Doe',
          cabinClass: 'economy' as const
        }),
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED' as const
        }
      };

      expect(() => CreateBookingSchema.parse(booking)).toThrow();
    });
  });
});

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './get-booking.handler';
import { bookingRepository } from '../repositories/booking.repository';

jest.mock('../repositories/booking.repository');

describe('get-booking handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a booking successfully', async () => {
    const mockBooking = {
      bookingId: '550e8400-e29b-41d4-a716-446655440002',
      confirmationCode: 'ABC123',
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
      },
      status: 'CONFIRMED' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    (bookingRepository.getById as jest.Mock).mockResolvedValue(mockBooking);

    const event = {
      pathParameters: {
        id: '550e8400-e29b-41d4-a716-446655440002'
      }
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ data: mockBooking });
  });

  it('should return 404 if booking not found', async () => {
    (bookingRepository.getById as jest.Mock).mockResolvedValue(null);

    const event = {
      pathParameters: {
        id: '550e8400-e29b-41d4-a716-446655440002'
      }
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Booking not found');
  });

  it('should return 400 if booking ID is missing', async () => {
    const event = {
      pathParameters: {}
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Booking ID is required');
  });
});

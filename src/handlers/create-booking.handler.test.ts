import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './create-booking.handler';
import { bookingRepository } from '../repositories/booking.repository';
import { flightsApiClient } from '../clients/flights-api.client';
import { customersApiClient } from '../clients/customers-api.client';

jest.mock('../repositories/booking.repository');
jest.mock('../clients/flights-api.client');
jest.mock('../clients/customers-api.client');

describe('create-booking handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a booking successfully', async () => {
    const mockCustomer = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      loyaltyProgram: {
        membershipNumber: 'LP123456',
        tier: 'gold',
        points: 5000
      }
    };

    const mockFlight = {
      flightId: '550e8400-e29b-41d4-a716-446655440001',
      flightNumber: 'CL123',
      departure: {
        airportCode: 'LAX',
        dateTime: '2024-12-01T10:00:00Z'
      },
      arrival: {
        airportCode: 'JFK',
        dateTime: '2024-12-01T18:00:00Z'
      },
      aircraft: {
        type: 'Boeing 737',
        totalSeats: 180
      },
      availableSeats: {
        economy: 50,
        business: 10,
        first: 5
      },
      status: 'scheduled'
    };

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

    (customersApiClient.getCustomer as jest.Mock).mockResolvedValue(mockCustomer);
    (flightsApiClient.getFlight as jest.Mock).mockResolvedValue(mockFlight);
    (bookingRepository.create as jest.Mock).mockResolvedValue(mockBooking);
    (flightsApiClient.updateAvailableSeats as jest.Mock).mockResolvedValue(mockFlight);
    (customersApiClient.updateLoyaltyPoints as jest.Mock).mockResolvedValue(mockCustomer);

    const event = {
      body: JSON.stringify({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            cabinClass: 'economy'
          }
        ],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED'
        }
      })
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({ data: mockBooking });
    expect(customersApiClient.getCustomer).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(flightsApiClient.getFlight).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    expect(flightsApiClient.updateAvailableSeats).toHaveBeenCalled();
  });

  it('should return 400 if body is missing', async () => {
    const event = {} as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Request body is required');
  });

  it('should return 404 if customer not found', async () => {
    (customersApiClient.getCustomer as jest.Mock).mockRejectedValue(new Error('Customer not found'));

    const event = {
      body: JSON.stringify({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            cabinClass: 'economy'
          }
        ],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED'
        }
      })
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });

  it('should return 400 if insufficient seats', async () => {
    const mockCustomer = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    };

    const mockFlight = {
      flightId: '550e8400-e29b-41d4-a716-446655440001',
      flightNumber: 'CL123',
      departure: {
        airportCode: 'LAX',
        dateTime: '2024-12-01T10:00:00Z'
      },
      arrival: {
        airportCode: 'JFK',
        dateTime: '2024-12-01T18:00:00Z'
      },
      aircraft: {
        type: 'Boeing 737',
        totalSeats: 180
      },
      availableSeats: {
        economy: 0,
        business: 10,
        first: 5
      },
      status: 'scheduled'
    };

    (customersApiClient.getCustomer as jest.Mock).mockResolvedValue(mockCustomer);
    (flightsApiClient.getFlight as jest.Mock).mockResolvedValue(mockFlight);

    const event = {
      body: JSON.stringify({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        flightId: '550e8400-e29b-41d4-a716-446655440001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            cabinClass: 'economy'
          }
        ],
        pricing: {
          baseFare: 299.99,
          taxes: 45.00,
          total: 344.99
        },
        payment: {
          transactionId: 'txn_123456',
          status: 'COMPLETED'
        }
      })
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Insufficient seats available');
  });
});

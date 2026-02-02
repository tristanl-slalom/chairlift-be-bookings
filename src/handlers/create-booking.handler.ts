import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateBookingSchema } from '../models/booking.model';
import { bookingRepository } from '../repositories/booking.repository';
import { flightsApiClient } from '../clients/flights-api.client';
import { customersApiClient } from '../clients/customers-api.client';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const input = CreateBookingSchema.parse(JSON.parse(event.body));

    // Step 1: Validate customer exists
    logger.info('Validating customer', { customerId: input.customerId });
    const customer = await customersApiClient.getCustomer(input.customerId);
    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Step 2: Validate flight exists and has availability
    logger.info('Validating flight', { flightId: input.flightId });
    const flight = await flightsApiClient.getFlight(input.flightId);
    if (!flight) {
      return errorResponse('Flight not found', 404);
    }

    // Step 3: Count seats needed by cabin class
    const seatsNeeded = {
      economy: 0,
      business: 0,
      first: 0
    };

    input.passengers.forEach(passenger => {
      seatsNeeded[passenger.cabinClass]++;
    });

    // Validate availability
    if (seatsNeeded.economy > flight.availableSeats.economy ||
        seatsNeeded.business > flight.availableSeats.business ||
        seatsNeeded.first > flight.availableSeats.first) {
      return errorResponse('Insufficient seats available', 400);
    }

    // Step 4: Create booking
    logger.info('Creating booking', { customerId: input.customerId, flightId: input.flightId });
    const booking = await bookingRepository.create(input);

    // Step 5: Update flight seat availability
    try {
      await flightsApiClient.updateAvailableSeats(input.flightId, {
        economy: seatsNeeded.economy > 0 ? -seatsNeeded.economy : undefined,
        business: seatsNeeded.business > 0 ? -seatsNeeded.business : undefined,
        first: seatsNeeded.first > 0 ? -seatsNeeded.first : undefined
      });
    } catch (error) {
      logger.error('Failed to update flight seats, rolling back booking', { bookingId: booking.bookingId, error });
      await bookingRepository.delete(booking.bookingId);
      return errorResponse('Failed to reserve seats');
    }

    // Step 6: Award loyalty points (best effort, don't fail if this fails)
    if (customer.loyaltyProgram) {
      try {
        const pointsToAward = Math.floor(input.pricing.total * 0.1); // 10% of total as points
        await customersApiClient.updateLoyaltyPoints(input.customerId, {
          points: pointsToAward,
          operation: 'add',
          reason: `Booking ${booking.confirmationCode}`
        });
        logger.info('Loyalty points awarded', { customerId: input.customerId, points: pointsToAward });
      } catch (error) {
        logger.warn('Failed to award loyalty points, continuing anyway', { customerId: input.customerId, error });
      }
    }

    logger.info('Booking created successfully', { bookingId: booking.bookingId, confirmationCode: booking.confirmationCode });
    return successResponse(booking, 201);
  } catch (error: any) {
    logger.error('Error creating booking', { error: error.message, stack: error.stack });

    if (error.name === 'ZodError') {
      return errorResponse('Invalid input', 400);
    }

    return errorResponse('Internal server error');
  }
}

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import { flightsApiClient } from '../clients/flights-api.client';
import { customersApiClient } from '../clients/customers-api.client';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return errorResponse('Booking ID is required', 400);
    }

    // Get existing booking
    logger.info('Cancelling booking', { bookingId });
    const existingBooking = await bookingRepository.getById(bookingId);

    if (!existingBooking) {
      return errorResponse('Booking not found', 404);
    }

    // Cancel the booking
    const booking = await bookingRepository.cancel(bookingId);

    if (!booking) {
      return errorResponse('Booking not found', 404);
    }

    // Step 1: Release seats back to flight inventory
    const seatsToRelease = {
      economy: 0,
      business: 0,
      first: 0
    };

    existingBooking.passengers.forEach(passenger => {
      seatsToRelease[passenger.cabinClass]++;
    });

    try {
      await flightsApiClient.releaseSeats(existingBooking.flightId, seatsToRelease);
      logger.info('Seats released', { flightId: existingBooking.flightId, seats: seatsToRelease });
    } catch (error) {
      logger.error('Failed to release seats, but booking is cancelled', { bookingId, error });
      // Continue even if seat release fails - booking is already cancelled
    }

    // Step 2: Deduct loyalty points (best effort)
    try {
      const pointsToDeduct = Math.floor(existingBooking.pricing.total * 0.1);
      await customersApiClient.updateLoyaltyPoints(existingBooking.customerId, {
        points: pointsToDeduct,
        operation: 'subtract',
        reason: `Cancellation of booking ${existingBooking.confirmationCode}`
      });
      logger.info('Loyalty points deducted', { customerId: existingBooking.customerId, points: pointsToDeduct });
    } catch (error) {
      logger.warn('Failed to deduct loyalty points, continuing anyway', { customerId: existingBooking.customerId, error });
      // Continue even if loyalty point deduction fails
    }

    logger.info('Booking cancelled successfully', { bookingId });
    return successResponse(booking);
  } catch (error: any) {
    logger.error('Error cancelling booking', { bookingId: event.pathParameters?.id, error: error.message });

    if (error.message.includes('Cannot cancel')) {
      return errorResponse(error.message, 400);
    }

    if (error.message.includes('already cancelled')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error');
  }
}

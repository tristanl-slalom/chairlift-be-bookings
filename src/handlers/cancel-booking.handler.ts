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
      return errorResponse(400, 'Booking ID is required');
    }

    // Get existing booking
    logger.info('Cancelling booking', { bookingId });
    const existingBooking = await bookingRepository.getById(bookingId);

    if (!existingBooking) {
      return errorResponse(404, 'Booking not found');
    }

    // Cancel the booking
    const booking = await bookingRepository.cancel(bookingId);

    if (!booking) {
      return errorResponse(404, 'Booking not found');
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
    return successResponse(200, booking);
  } catch (error: any) {
    logger.error('Error cancelling booking', { bookingId: event.pathParameters?.id, error: error.message });

    if (error.message.includes('Cannot cancel')) {
      return errorResponse(400, error.message);
    }

    if (error.message.includes('already cancelled')) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, 'Internal server error');
  }
}

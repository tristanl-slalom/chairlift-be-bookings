import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return errorResponse(400, 'Booking ID is required');
    }

    logger.info('Checking in booking', { bookingId });
    const booking = await bookingRepository.checkIn(bookingId);

    if (!booking) {
      return errorResponse(404, 'Booking not found');
    }

    return successResponse(200, booking);
  } catch (error: any) {
    logger.error('Error checking in booking', { bookingId: event.pathParameters?.id, error: error.message });

    if (error.message.includes('Cannot check in')) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, 'Internal server error');
  }
}

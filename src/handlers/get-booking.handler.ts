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

    logger.info('Getting booking', { bookingId });
    const booking = await bookingRepository.getById(bookingId);

    if (!booking) {
      return errorResponse(404, 'Booking not found');
    }

    return successResponse(200, booking);
  } catch (error: any) {
    logger.error('Error getting booking', { error: error.message });
    return errorResponse(500, 'Internal server error');
  }
}

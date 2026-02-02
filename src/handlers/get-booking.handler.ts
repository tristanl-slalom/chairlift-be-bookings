import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return errorResponse('Booking ID is required', 400);
    }

    logger.info('Getting booking', { bookingId });
    const booking = await bookingRepository.getById(bookingId);

    if (!booking) {
      return errorResponse('Booking not found', 404);
    }

    return successResponse(booking);
  } catch (error: any) {
    logger.error('Error getting booking', { error: error.message });
    return errorResponse('Internal server error');
  }
}

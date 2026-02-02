import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const confirmationCode = event.pathParameters?.code;
    if (!confirmationCode) {
      return errorResponse('Confirmation code is required', 400);
    }

    logger.info('Getting booking by confirmation', { confirmationCode });
    const booking = await bookingRepository.getByConfirmationCode(confirmationCode);

    if (!booking) {
      return errorResponse('Booking not found', 404);
    }

    return successResponse(booking);
  } catch (error: any) {
    logger.error('Error getting booking by confirmation', { error: error.message });
    return errorResponse('Internal server error');
  }
}

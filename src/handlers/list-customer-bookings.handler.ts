import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
      return errorResponse('Customer ID is required', 400);
    }

    logger.info('Listing customer bookings', { customerId });
    const bookings = await bookingRepository.getByCustomerId(customerId);

    return successResponse(bookings);
  } catch (error: any) {
    logger.error('Error listing customer bookings', { error: error.message });
    return errorResponse('Internal server error');
  }
}

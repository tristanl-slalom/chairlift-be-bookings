import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookingRepository } from '../repositories/booking.repository';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
      return errorResponse(400, 'Customer ID is required');
    }

    logger.info('Listing customer bookings', { customerId });
    const bookings = await bookingRepository.getByCustomerId(customerId);

    return successResponse(200, bookings);
  } catch (error: any) {
    logger.error('Error listing customer bookings', { error: error.message });
    return errorResponse(500, 'Internal server error');
  }
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  Booking,
  DynamoDBBooking,
  CreateBookingInput,
  UpdateBookingInput,
  BookingStatus
} from '../models/booking.model';
import logger from '../utils/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'chairlift-bookings';

/**
 * Generates a 6-character confirmation code
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class BookingRepository {
  private tableName: string;

  constructor(tableName: string = TABLE_NAME) {
    this.tableName = tableName;
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    const bookingId = uuidv4();
    const confirmationCode = generateConfirmationCode();
    const now = new Date().toISOString();

    const booking: DynamoDBBooking = {
      PK: `BOOKING#${bookingId}`,
      SK: 'METADATA',
      GSI1PK: `CUSTOMER#${input.customerId}`,
      GSI1SK: `CREATED#${now}`,
      GSI2PK: `FLIGHT#${input.flightId}`,
      GSI2SK: `BOOKING#${bookingId}`,
      GSI3PK: `STATUS#${BookingStatus.CONFIRMED}`,
      GSI3SK: `CREATED#${now}`,
      GSI4PK: `CONFIRMATION#${confirmationCode}`,
      GSI4SK: `BOOKING#${bookingId}`,
      bookingId,
      confirmationCode,
      customerId: input.customerId,
      flightId: input.flightId,
      passengers: input.passengers,
      pricing: input.pricing,
      payment: input.payment,
      status: BookingStatus.CONFIRMED,
      createdAt: now,
      updatedAt: now
    };

    try {
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: booking
      }));

      logger.info('Booking created', { bookingId, confirmationCode });
      return this.toBooking(booking);
    } catch (error) {
      logger.error('Error creating booking', { error });
      throw error;
    }
  }

  async getById(bookingId: string): Promise<Booking | null> {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: 'METADATA'
        }
      }));

      if (!result.Item) {
        return null;
      }

      return this.toBooking(result.Item as DynamoDBBooking);
    } catch (error) {
      logger.error('Error getting booking', { bookingId, error });
      throw error;
    }
  }

  async getByConfirmationCode(confirmationCode: string): Promise<Booking | null> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :gsi4pk',
        ExpressionAttributeValues: {
          ':gsi4pk': `CONFIRMATION#${confirmationCode}`
        },
        Limit: 1
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.toBooking(result.Items[0] as DynamoDBBooking);
    } catch (error) {
      logger.error('Error getting booking by confirmation', { confirmationCode, error });
      throw error;
    }
  }

  async getByCustomerId(customerId: string): Promise<Booking[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `CUSTOMER#${customerId}`
        },
        ScanIndexForward: false // Most recent first
      }));

      return (result.Items || []).map(item => this.toBooking(item as DynamoDBBooking));
    } catch (error) {
      logger.error('Error getting bookings by customer', { customerId, error });
      throw error;
    }
  }

  async getByFlightId(flightId: string): Promise<Booking[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':gsi2pk': `FLIGHT#${flightId}`
        }
      }));

      return (result.Items || []).map(item => this.toBooking(item as DynamoDBBooking));
    } catch (error) {
      logger.error('Error getting bookings by flight', { flightId, error });
      throw error;
    }
  }

  async update(bookingId: string, input: UpdateBookingInput): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now
    };

    if (input.passengers !== undefined) {
      updateExpressions.push('#passengers = :passengers');
      expressionAttributeNames['#passengers'] = 'passengers';
      expressionAttributeValues[':passengers'] = input.passengers;
    }

    if (input.pricing !== undefined) {
      updateExpressions.push('#pricing = :pricing');
      expressionAttributeNames['#pricing'] = 'pricing';
      expressionAttributeValues[':pricing'] = input.pricing;
    }

    if (input.payment !== undefined) {
      updateExpressions.push('#payment = :payment');
      expressionAttributeNames['#payment'] = 'payment';
      expressionAttributeValues[':payment'] = input.payment;
    }

    try {
      const result = await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      logger.info('Booking updated', { bookingId });
      return this.toBooking(result.Attributes as DynamoDBBooking);
    } catch (error) {
      logger.error('Error updating booking', { bookingId, error });
      throw error;
    }
  }

  async checkIn(bookingId: string): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing) {
      return null;
    }

    if (existing.status !== BookingStatus.CONFIRMED) {
      throw new Error(`Cannot check in booking with status: ${existing.status}`);
    }

    const now = new Date().toISOString();

    try {
      const result = await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET #status = :status, #GSI3PK = :gsi3pk, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#GSI3PK': 'GSI3PK',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': BookingStatus.CHECKED_IN,
          ':gsi3pk': `STATUS#${BookingStatus.CHECKED_IN}`,
          ':updatedAt': now
        },
        ReturnValues: 'ALL_NEW'
      }));

      logger.info('Booking checked in', { bookingId });
      return this.toBooking(result.Attributes as DynamoDBBooking);
    } catch (error) {
      logger.error('Error checking in booking', { bookingId, error });
      throw error;
    }
  }

  async cancel(bookingId: string): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing) {
      return null;
    }

    if (existing.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    if (existing.status === BookingStatus.CHECKED_IN) {
      throw new Error('Cannot cancel a checked-in booking');
    }

    const now = new Date().toISOString();

    try {
      const result = await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET #status = :status, #GSI3PK = :gsi3pk, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#GSI3PK': 'GSI3PK',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': BookingStatus.CANCELLED,
          ':gsi3pk': `STATUS#${BookingStatus.CANCELLED}`,
          ':updatedAt': now
        },
        ReturnValues: 'ALL_NEW'
      }));

      logger.info('Booking cancelled', { bookingId });
      return this.toBooking(result.Attributes as DynamoDBBooking);
    } catch (error) {
      logger.error('Error cancelling booking', { bookingId, error });
      throw error;
    }
  }

  async delete(bookingId: string): Promise<boolean> {
    try {
      await docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: 'METADATA'
        }
      }));

      logger.info('Booking deleted', { bookingId });
      return true;
    } catch (error) {
      logger.error('Error deleting booking', { bookingId, error });
      throw error;
    }
  }

  private toBooking(dynamoDBBooking: DynamoDBBooking): Booking {
    return {
      bookingId: dynamoDBBooking.bookingId,
      confirmationCode: dynamoDBBooking.confirmationCode,
      customerId: dynamoDBBooking.customerId,
      flightId: dynamoDBBooking.flightId,
      passengers: dynamoDBBooking.passengers,
      pricing: dynamoDBBooking.pricing,
      payment: dynamoDBBooking.payment,
      status: dynamoDBBooking.status,
      createdAt: dynamoDBBooking.createdAt,
      updatedAt: dynamoDBBooking.updatedAt
    };
  }
}

export const bookingRepository = new BookingRepository();

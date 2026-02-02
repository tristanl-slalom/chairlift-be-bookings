import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyProgram?: {
    membershipNumber: string;
    tier: string;
    points: number;
  };
}

export interface UpdateLoyaltyPointsRequest {
  points: number;
  operation: 'add' | 'subtract';
  reason: string;
}

export class CustomersApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CUSTOMERS_API_URL || '';
    if (!this.baseUrl) {
      throw new Error('CUSTOMERS_API_URL environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      logger.info('Fetching customer', { customerId });
      const response = await this.client.get<{ data: Customer }>(`/customers/${customerId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching customer', { customerId, error });
      throw new Error(`Failed to fetch customer: ${customerId}`);
    }
  }

  async updateLoyaltyPoints(customerId: string, request: UpdateLoyaltyPointsRequest): Promise<Customer> {
    try {
      logger.info('Updating loyalty points', { customerId, request });
      const response = await this.client.put<{ data: Customer }>(
        `/customers/${customerId}/loyalty-points`,
        request
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error updating loyalty points', { customerId, request, error });
      throw new Error(`Failed to update loyalty points for customer: ${customerId}`);
    }
  }
}

export const customersApiClient = new CustomersApiClient();

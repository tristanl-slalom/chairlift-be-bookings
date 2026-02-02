import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export interface Flight {
  flightId: string;
  flightNumber: string;
  departure: {
    airportCode: string;
    dateTime: string;
  };
  arrival: {
    airportCode: string;
    dateTime: string;
  };
  aircraft: {
    type: string;
    totalSeats: number;
  };
  availableSeats: {
    economy: number;
    business: number;
    first: number;
  };
  status: string;
}

export interface UpdateSeatsRequest {
  economy?: number;
  business?: number;
  first?: number;
}

export class FlightsApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.FLIGHTS_API_URL || '';
    if (!this.baseUrl) {
      throw new Error('FLIGHTS_API_URL environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getFlight(flightId: string): Promise<Flight> {
    try {
      logger.info('Fetching flight', { flightId });
      const response = await this.client.get<{ data: Flight }>(`/flights/${flightId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching flight', { flightId, error });
      throw new Error(`Failed to fetch flight: ${flightId}`);
    }
  }

  async updateAvailableSeats(flightId: string, seatsToDeduct: UpdateSeatsRequest): Promise<Flight> {
    try {
      logger.info('Updating available seats', { flightId, seatsToDeduct });
      const response = await this.client.put<{ data: Flight }>(
        `/flights/${flightId}/seats`,
        seatsToDeduct
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error updating seats', { flightId, seatsToDeduct, error });
      throw new Error(`Failed to update seats for flight: ${flightId}`);
    }
  }

  async releaseSeats(flightId: string, seatsToRelease: UpdateSeatsRequest): Promise<Flight> {
    try {
      logger.info('Releasing seats', { flightId, seatsToRelease });
      // Convert to positive numbers for release
      const releaseRequest: UpdateSeatsRequest = {
        economy: seatsToRelease.economy ? -seatsToRelease.economy : undefined,
        business: seatsToRelease.business ? -seatsToRelease.business : undefined,
        first: seatsToRelease.first ? -seatsToRelease.first : undefined
      };
      const response = await this.client.put<{ data: Flight }>(
        `/flights/${flightId}/seats`,
        releaseRequest
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error releasing seats', { flightId, seatsToRelease, error });
      throw new Error(`Failed to release seats for flight: ${flightId}`);
    }
  }
}

export const flightsApiClient = new FlightsApiClient();

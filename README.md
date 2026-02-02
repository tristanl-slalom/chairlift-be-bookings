# Chairlift Bookings Microservice

Backend microservice for managing flight bookings in the Chairlift application. Built with AWS Lambda, DynamoDB, and API Gateway.

## Architecture

- **Runtime**: Node.js 20 with TypeScript
- **Database**: Amazon DynamoDB
- **API**: AWS Lambda + API Gateway (REST)
- **Infrastructure**: AWS CDK
- **CI/CD**: GitHub Actions with OIDC authentication
- **Service Dependencies**: Flights service, Customers service

## Features

- Create and manage flight bookings
- Multi-service integration (Flights, Customers)
- Confirmation code generation
- Seat inventory management
- Loyalty points integration
- Check-in functionality
- Booking cancellation with refunds
- Input validation with Zod
- Structured logging with Winston
- Comprehensive test coverage
- Production-ready infrastructure code

## API Endpoints

### Create Booking
```
POST /bookings
Content-Type: application/json

{
  "customerId": "uuid",
  "flightId": "uuid",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "cabinClass": "economy" | "business" | "first"
    }
  ],
  "pricing": {
    "baseFare": 299.99,
    "taxes": 45.00,
    "total": 344.99
  },
  "payment": {
    "transactionId": "txn_123456",
    "status": "COMPLETED"
  }
}

Response: 201 Created
{
  "data": {
    "bookingId": "uuid",
    "confirmationCode": "ABC123",
    "customerId": "uuid",
    "flightId": "uuid",
    "passengers": [...],
    "pricing": {...},
    "payment": {...},
    "status": "CONFIRMED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Booking
```
GET /bookings/{id}

Response: 200 OK / 404 Not Found
```

### Get Booking by Confirmation Code
```
GET /bookings/confirmation/{code}

Response: 200 OK / 404 Not Found
```

### List Customer Bookings
```
GET /bookings/customer/{customerId}

Response: 200 OK
{
  "data": [...]
}
```

### Check In
```
PUT /bookings/{id}/check-in

Response: 200 OK / 404 Not Found
{
  "data": {
    "bookingId": "uuid",
    "status": "CHECKED_IN",
    ...
  }
}
```

### Cancel Booking
```
DELETE /bookings/{id}

Response: 200 OK / 404 Not Found
{
  "data": {
    "bookingId": "uuid",
    "status": "CANCELLED",
    ...
  }
}
```

## Local Development

### Prerequisites

- Node.js 20+
- npm or yarn
- AWS CLI configured (for deployment)
- AWS CDK CLI (`npm install -g aws-cdk`)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

3. Lint code:
```bash
npm run lint
npm run lint:fix
```

4. Build:
```bash
npm run build
```

## Deployment

### Prerequisites

1. Flights service must be deployed first (exports ChairliftFlightsApiUrl)
2. Customers service must be deployed first (exports ChairliftCustomersApiUrl)
3. AWS OIDC setup completed
4. GitHub repository secrets configured

### Manual Deployment

```bash
# Build the project
npm run build

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy

# View outputs
aws cloudformation describe-stacks \
  --stack-name ChairliftBookingsServiceStack \
  --query 'Stacks[0].Outputs'
```

### CI/CD Pipeline

The project uses GitHub Actions for CI/CD with branch-aware deployments.

## DynamoDB Table Design

**Table Name**: `chairlift-bookings`

**Primary Key**:
- PK (Partition Key): `BOOKING#{bookingId}`
- SK (Sort Key): `METADATA`

**GSI1** (Customer lookup):
- GSI1PK: `CUSTOMER#{customerId}`
- GSI1SK: `CREATED#{timestamp}`

**GSI2** (Flight lookup):
- GSI2PK: `FLIGHT#{flightId}`
- GSI2SK: `BOOKING#{bookingId}`

**GSI3** (Status lookup):
- GSI3PK: `STATUS#{status}`
- GSI3SK: `CREATED#{timestamp}`

**GSI4** (Confirmation code lookup):
- GSI4PK: `CONFIRMATION#{code}`
- GSI4SK: `BOOKING#{bookingId}`

**Attributes**:
- bookingId: UUID
- confirmationCode: 6-character code
- customerId: UUID
- flightId: UUID
- passengers: Array of passenger objects
- pricing: Pricing object (baseFare, taxes, total)
- payment: Payment object (transactionId, status)
- status: enum (PENDING, CONFIRMED, CHECKED_IN, CANCELLED)
- createdAt: ISO 8601 timestamp
- updatedAt: ISO 8601 timestamp

## Project Structure

```
chairlift-be-bookings/
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── create-booking.handler.ts
│   │   ├── get-booking.handler.ts
│   │   ├── get-booking-by-confirmation.handler.ts
│   │   ├── list-customer-bookings.handler.ts
│   │   ├── check-in.handler.ts
│   │   └── cancel-booking.handler.ts
│   ├── repositories/       # Data access layer
│   │   └── booking.repository.ts
│   ├── models/            # Data models and schemas
│   │   └── booking.model.ts
│   ├── clients/           # API clients
│   │   ├── flights-api.client.ts
│   │   └── customers-api.client.ts
│   └── utils/             # Utilities
│       ├── logger.ts
│       └── response.ts
├── infrastructure/        # AWS CDK code
│   ├── bin/
│   │   └── app.ts
│   └── lib/
│       ├── bookings-service-stack.ts
│       └── branch-config.ts
├── .github/
│   └── workflows/        # CI/CD pipelines
├── package.json
├── tsconfig.json
├── jest.config.js
└── cdk.json
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: `chairlift-bookings`)
- `FLIGHTS_API_URL`: Flights service API URL (required)
- `CUSTOMERS_API_URL`: Customers service API URL (required)
- `LOG_LEVEL`: Logging level (default: `info`)
- `AWS_REGION`: AWS region (default: `us-west-2`)

## Service Integration

This service integrates with:

1. **Flights Service**: Validates flights, manages seat availability
2. **Customers Service**: Validates customers, manages loyalty points

## Related Repositories

- [chairlift-be-flights](https://github.com/tristanl-slalom/chairlift-be-flights) - Flights Microservice
- [chairlift-be-customers](https://github.com/tristanl-slalom/chairlift-be-customers) - Customers Microservice
- [chairlift-meta](https://github.com/tristanl-slalom/chairlift-meta) - Meta repository

## License

MIT

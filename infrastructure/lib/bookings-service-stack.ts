import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { BranchConfig } from './branch-config';

export interface BookingsServiceStackProps extends cdk.StackProps {
  branchConfig: BranchConfig;
}

export class BookingsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BookingsServiceStackProps) {
    super(scope, id, props);

    const { branchConfig } = props;

    // Import Flights and Customers API URLs from CloudFormation exports (with branch awareness)
    const flightsExportName = process.env.FLIGHTS_EXPORT_NAME || `ChairliftFlightsApiUrl${branchConfig.exportSuffix}`;
    const customersExportName = process.env.CUSTOMERS_EXPORT_NAME || `ChairliftCustomersApiUrl${branchConfig.exportSuffix}`;

    const flightsApiUrl = cdk.Fn.importValue(flightsExportName);
    const customersApiUrl = cdk.Fn.importValue(customersExportName);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'BookingsTable', {
      tableName: `chairlift-bookings${branchConfig.stackSuffix}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: branchConfig.isMainBranch ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: branchConfig.isMainBranch
    });

    // GSI1: Customer lookup (CUSTOMER#{customerId} / CREATED#{timestamp})
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // GSI2: Flight lookup (FLIGHT#{flightId} / BOOKING#{bookingId})
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // GSI3: Status lookup (STATUS#{status} / CREATED#{timestamp})
    table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // GSI4: Confirmation code lookup (CONFIRMATION#{code} / BOOKING#{bookingId})
    table.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: { name: 'GSI4PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Lambda function configuration
    const lambdaEnvironment = {
      TABLE_NAME: table.tableName,
      FLIGHTS_API_URL: flightsApiUrl,
      CUSTOMERS_API_URL: customersApiUrl,
      LOG_LEVEL: 'info'
    };

    const lambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK
    };

    // Lambda Functions
    const createBookingFn = new lambda.Function(this, 'CreateBookingFunction', {
      ...lambdaProps,
      functionName: `chairlift-create-booking${branchConfig.stackSuffix}`,
      handler: 'handlers/create-booking.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    const getBookingFn = new lambda.Function(this, 'GetBookingFunction', {
      ...lambdaProps,
      functionName: `chairlift-get-booking${branchConfig.stackSuffix}`,
      handler: 'handlers/get-booking.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    const getBookingByConfirmationFn = new lambda.Function(this, 'GetBookingByConfirmationFunction', {
      ...lambdaProps,
      functionName: `chairlift-get-booking-by-confirmation${branchConfig.stackSuffix}`,
      handler: 'handlers/get-booking-by-confirmation.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    const listCustomerBookingsFn = new lambda.Function(this, 'ListCustomerBookingsFunction', {
      ...lambdaProps,
      functionName: `chairlift-list-customer-bookings${branchConfig.stackSuffix}`,
      handler: 'handlers/list-customer-bookings.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    const checkInFn = new lambda.Function(this, 'CheckInFunction', {
      ...lambdaProps,
      functionName: `chairlift-check-in${branchConfig.stackSuffix}`,
      handler: 'handlers/check-in.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    const cancelBookingFn = new lambda.Function(this, 'CancelBookingFunction', {
      ...lambdaProps,
      functionName: `chairlift-cancel-booking${branchConfig.stackSuffix}`,
      handler: 'handlers/cancel-booking.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-dist'))
    });

    // Grant DynamoDB permissions
    table.grantReadWriteData(createBookingFn);
    table.grantReadData(getBookingFn);
    table.grantReadData(getBookingByConfirmationFn);
    table.grantReadData(listCustomerBookingsFn);
    table.grantReadWriteData(checkInFn);
    table.grantReadWriteData(cancelBookingFn);

    // API Gateway
    const api = new apigateway.RestApi(this, 'BookingsApi', {
      restApiName: `Chairlift Bookings API${branchConfig.stackSuffix}`,
      description: `API for managing bookings in Chairlift application (branch: ${branchConfig.branchName})`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      }
    });

    // API Resources
    const bookings = api.root.addResource('bookings');
    const booking = bookings.addResource('{id}');
    const checkIn = booking.addResource('check-in');
    const confirmation = bookings.addResource('confirmation');
    const confirmationCode = confirmation.addResource('{code}');
    const customer = bookings.addResource('customer');
    const customerBookings = customer.addResource('{customerId}');

    // API Methods
    bookings.addMethod('POST', new apigateway.LambdaIntegration(createBookingFn));
    booking.addMethod('GET', new apigateway.LambdaIntegration(getBookingFn));
    booking.addMethod('DELETE', new apigateway.LambdaIntegration(cancelBookingFn));
    checkIn.addMethod('PUT', new apigateway.LambdaIntegration(checkInFn));
    confirmationCode.addMethod('GET', new apigateway.LambdaIntegration(getBookingByConfirmationFn));
    customerBookings.addMethod('GET', new apigateway.LambdaIntegration(listCustomerBookingsFn));

    // Tag all resources with branch information
    cdk.Tags.of(this).add('Branch', branchConfig.branchName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: `Bookings API Gateway endpoint URL (branch: ${branchConfig.branchName})`,
      exportName: `ChairliftBookingsApiUrl${branchConfig.exportSuffix}`
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
      exportName: `ChairliftBookingsTableName${branchConfig.exportSuffix}`
    });
  }
}

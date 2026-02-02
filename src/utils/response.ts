import { APIGatewayProxyResult } from 'aws-lambda';

export const createResponse = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

export const successResponse = (data: unknown, statusCode = 200): APIGatewayProxyResult => {
  return createResponse(statusCode, { data });
};

export const errorResponse = (message: string, statusCode = 500): APIGatewayProxyResult => {
  return createResponse(statusCode, { error: message });
};

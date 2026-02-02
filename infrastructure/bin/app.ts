#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BookingsServiceStack } from '../lib/bookings-service-stack';
import { getBranchConfig } from '../lib/branch-config';

const app = new cdk.App();

// Detect branch and generate configuration
const branchConfig = getBranchConfig();

console.log(`Deploying Bookings service for branch: ${branchConfig.branchName}`);
console.log(`Stack name: ChairliftBookingsServiceStack${branchConfig.stackSuffix}`);

new BookingsServiceStack(app, `ChairliftBookingsServiceStack${branchConfig.stackSuffix}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  },
  description: `Chairlift Bookings Microservice Stack (branch: ${branchConfig.branchName})`,
  branchConfig
});

#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TextReaderStack } from '../lib/text-reader-stack';

const app = new cdk.App();
new TextReaderStack(app, 'TextReaderStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});

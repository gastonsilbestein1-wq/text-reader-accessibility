import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class TextReaderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket para imágenes y audio
    const dataBucket = new s3.Bucket(this, 'TextReaderDataBucket', {
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // S3 Bucket para hosting del frontend
    const websiteBucket = new s3.Bucket(this, 'TextReaderWebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // Lambda para procesar imagen con Nova Lite 2 (Bedrock)
    const processImageLambda = new lambda.Function(this, 'ProcessImageFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/process-image'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        BUCKET_NAME: dataBucket.bucketName
      }
    });

    // Lambda para convertir texto a audio con Polly
    const textToSpeechLambda = new lambda.Function(this, 'TextToSpeechFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/text-to-speech'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        BUCKET_NAME: dataBucket.bucketName
      }
    });

    // Permisos
    dataBucket.grantReadWrite(processImageLambda);
    dataBucket.grantReadWrite(textToSpeechLambda);

    processImageLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0',
        'arn:aws:bedrock:us-east-1:*:inference-profile/us.amazon.nova-2-lite-v1:0'
      ]
    }));

    textToSpeechLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*']
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'TextReaderApi', {
      restApiName: 'Text Reader Service',
      description: 'API for Text Reader application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200
      }
    });

    const processIntegration = new apigateway.LambdaIntegration(processImageLambda);
    const ttsIntegration = new apigateway.LambdaIntegration(textToSpeechLambda);

    api.root.addResource('process').addMethod('POST', processIntegration);
    api.root.addResource('speak').addMethod('POST', ttsIntegration);

    // CloudFront Distribution para el frontend
    const distribution = new cloudfront.Distribution(this, 'TextReaderDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        }
      ]
    });

    // Deploy del frontend (se ejecutará después del build)
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../frontend/build')],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*']
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { 
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'TextReaderApiUrl'
    });
    
    new cdk.CfnOutput(this, 'WebsiteUrl', { 
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Website URL',
      exportName: 'TextReaderWebsiteUrl'
    });
    
    new cdk.CfnOutput(this, 'DataBucketName', { 
      value: dataBucket.bucketName,
      description: 'S3 Bucket for data storage',
      exportName: 'TextReaderDataBucket'
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', { 
      value: websiteBucket.bucketName,
      description: 'S3 Bucket for website hosting',
      exportName: 'TextReaderWebsiteBucket'
    });
  }
}

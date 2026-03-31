"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextReaderStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
class TextReaderStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.TextReaderStack = TextReaderStack;

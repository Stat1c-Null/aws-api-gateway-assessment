# AWS API Gateway Assessment

This repository contains a serverless AWS application that authenticates users with Amazon Cognito, serves a static frontend through Amazon S3 and Amazon CloudFront, exposes protected API endpoints through Amazon API Gateway, and runs backend logic in AWS Lambda.

## Repository structure

```text
.
├── cloudformation/
│   └── final_production_api_stack.yaml
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── config.js
├── lambdas/
│   ├── lambda1/
│   │   └── index.ts
│   └── lambda2/
│       └── lambda_function.py
└── README.md
```

## Overall architecture

### High-level architecture

```text
Browser
  ↓
CloudFront
  ↓
S3 (static frontend)

Browser
  ↓
Cognito Managed Login
  ↓
JWT tokens

Browser
  ↓ Authorization: Bearer <token>
API Gateway (HTTP API + JWT Authorizer)
  ↓
Lambda Functions
  ├─ Joke Lambda → Official Joke API
  └─ Location Lambda → ip-api.com
```

### AWS services used

- **Amazon Cognito**
  - User authentication
  - Managed login UI
  - OAuth 2.0 / OpenID Connect
  - Optional TOTP MFA

- **Amazon API Gateway (HTTP API)**
  - Public API entry point
  - JWT authorizer using Cognito
  - CORS configuration for frontend access

- **AWS Lambda**
  - Executes backend logic for API routes

- **Amazon S3**
  - Stores static frontend assets

- **Amazon CloudFront**
  - Delivers frontend over HTTPS
  - Uses the S3 bucket as origin

- **Amazon CloudWatch**
  - Stores Lambda and API logs

## External services chosen for the Lambda functions

This solution uses the following public APIs inside Lambda:

### 1. Official Joke API
Used by the jokes Lambda function.

- Endpoint:
  `https://official-joke-api.appspot.com/random_joke`

Purpose:
- Returns a random joke as JSON

### 2. IP-API
Used by the location Lambda function.

- Endpoint:
  `http://ip-api.com/json`

Purpose:
- Returns IP-based geolocation information

> Note: the location API returns the location of the caller that reaches the API. When called from Lambda, that usually reflects AWS egress/network location, not necessarily the end user’s device location.

## Prerequisites and dependencies

Before deploying this solution, make sure you have:

- An AWS account
- Permissions to create:
  - CloudFormation stacks
  - Cognito resources
  - Lambda functions
  - API Gateway resources
  - S3 buckets
  - CloudFront distributions
  - IAM roles and policies
  - CloudWatch log groups
- AWS CLI installed and configured
- A local copy of the frontend files in `frontend/`
- A local copy of the CloudFormation template in `cloudformation/`

## CloudFormation deployment guide

The CloudFormation template creates the full infrastructure stack, including:

- Cognito User Pool
- Cognito public SPA app client
- Cognito managed login domain
- Lambda functions
- API Gateway HTTP API
- JWT authorizer
- S3 bucket
- CloudFront distribution
- CloudWatch log groups
- IAM roles and permissions

### Step 1 — Validate the CloudFormation template

```bash
aws cloudformation validate-template \
  --template-body file://cloudformation/final_production_api_stack.yaml
```

### Step 2 — Deploy the stack

```bash
aws cloudformation deploy \
  --template-file cloudformation/final_production_api_stack.yaml \
  --stack-name aws-api-gateway-assessment \
  --capabilities CAPABILITY_NAMED_IAM
```

### Step 3 — Wait for stack creation to complete

```bash
aws cloudformation describe-stacks \
  --stack-name aws-api-gateway-assessment
```

### Step 4 — Review stack outputs

The stack outputs include values such as:

- User Pool ID
- SPA App Client ID
- Cognito domain
- API base URL
- S3 bucket name
- CloudFront domain

Example:

```bash
aws cloudformation describe-stacks \
  --stack-name aws-api-gateway-assessment \
  --query "Stacks[0].Outputs"
```

### Step 5 — Upload the frontend to S3

After the stack is created, upload the frontend files from the `frontend/` folder:

```bash
aws s3 sync ./frontend s3://api-assessment-bucket --delete
```

> If the bucket name differs from the default, replace it with the S3 bucket name from the stack outputs.

### Step 6 — Wait for CloudFront deployment and test the app

Open the CloudFront distribution URL from the stack outputs in your browser.

## Cognito User Pool configuration

The CloudFormation template creates and configures the Cognito User Pool automatically.

### Cognito settings used in this solution

- **User Pool ID**
  - `us-east-1_z9WqYRQJY`

- **Managed login domain**
  - `https://us-east-1z9wqyrqjy.auth.us-east-1.amazoncognito.com`

- **SPA App Client ID**
  - `4nslouek8manor1s8vjrsctahb`

- **Callback URLs**
  - `http://localhost:5500/`
  - `https://d33qgg2llz5yz2.cloudfront.net/`

- **Sign-out URLs**
  - `http://localhost:5500/`
  - `https://d33qgg2llz5yz2.cloudfront.net/`

- **OAuth flow**
  - Authorization code grant

- **Scopes**
  - `openid`
  - `email`
  - `profile`

- **MFA**
  - MFA = Optional
  - TOTP = Enabled
  - SMS MFA = Disabled

### Manual verification steps

If you want to verify the Cognito configuration in the AWS Console:

1. Open **Amazon Cognito**
2. Open **User Pools**
3. Select the deployed user pool
4. Confirm:
   - Managed login domain exists
   - App client has no secret
   - Callback/sign-out URLs are correct
   - Authorization code grant is enabled
   - `openid`, `email`, and `profile` scopes are enabled
   - MFA is optional and TOTP is enabled

## Frontend hosting

The frontend is hosted as a static site using:

- **Amazon S3** for file storage
- **Amazon CloudFront** for HTTPS delivery

### Frontend files

Files stored in `frontend/`:

- `frontend/index.html`
- `frontend/app.js`
- `frontend/config.js`

### Frontend configuration

The frontend uses `config.js` to store public configuration values:

- AWS region
- Cognito domain
- SPA app client ID
- API base URL

These values are safe to expose in a browser-based frontend because they are identifiers and public endpoints, not secrets.

## Lambda functions

### Joke Lambda
- Source folder: `lambdas/lambda1/`
- Runtime: `nodejs20.x`
- Handler: `index.handler`
- Route: `GET /api/jokes`

### Location Lambda
- Source folder: `lambdas/lambda2/`
- Runtime: `python3.11`
- Handler: `lambda_function.lambda_handler`
- Route: `GET /api/location`

## How Lambda functions are invoked via API Gateway

The Lambda functions are invoked through API Gateway, not directly from the browser.

### Request flow

1. User signs in through Cognito managed login
2. Frontend receives authentication tokens
3. Frontend sends an HTTP request to API Gateway with:

```http
Authorization: Bearer <JWT_TOKEN>
```

4. API Gateway validates the JWT with the Cognito user pool
5. If valid, API Gateway invokes the target Lambda function
6. Lambda calls the external service and returns JSON
7. API Gateway returns the response to the frontend

### API routes

- `GET /api/jokes` → Joke Lambda
- `GET /api/location` → Location Lambda

## API endpoint testing instructions

### Base URL

Use the API Gateway URL from the CloudFormation outputs.

Example format:

```text
https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

### Test 1 — Unauthorized request

A request without a JWT token should fail.

```bash
curl -i https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/api/jokes
```

Expected behavior:
- HTTP `401 Unauthorized`

### Test 2 — Authorized jokes request

```bash
curl -i https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/api/jokes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:

```json
{
  "source": "official-joke-api",
  "joke": {
    "id": 123,
    "type": "general",
    "setup": "Why did the developer go broke?",
    "punchline": "Because he used up all his cache."
  }
}
```

### Test 3 — Authorized location request

```bash
curl -i https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/api/location \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:

```json
{
  "source": "ip-api",
  "location": {
    "country": "United States",
    "regionName": "Virginia",
    "city": "Ashburn",
    "lat": 39.03,
    "lon": -77.5
  }
}
```

## Local frontend testing

To test locally before using CloudFront:

1. Serve the frontend locally from the `frontend/` folder:

```bash
python3 -m http.server 5500 --bind localhost --directory frontend
```

2. Open:

```text
http://localhost:5500/
```

3. Sign in through Cognito
4. Click:
   - `Call /api/jokes`
   - `Call /api/location`

## Assumptions

- The frontend is a static browser application
- The browser uses the Cognito managed login UI
- The frontend uses the public SPA app client with authorization code flow
- API Gateway protects routes with a Cognito JWT authorizer
- CloudFront is used for HTTPS delivery of the static frontend
- Lambda code is deployed inline by CloudFormation

## Limitations

- The location API returns IP-based location from the Lambda execution environment, which may not equal the end user’s device location
- The frontend contains public configuration values such as the Cognito domain and client ID, which is expected for a browser-based SPA
- CloudFront domain names generated by AWS may differ between deployments
- If API Gateway `AutoDeploy` is disabled, infrastructure changes may require a new API deployment to update the `prod` stage

## Additional configuration notes

- CORS allowed origins must be configured as origins only, without a trailing slash  
  Example:

```text
https://d33qgg2llz5yz2.cloudfront.net
```

- Cognito callback and sign-out URLs should include the trailing slash  
  Example:

```text
https://d33qgg2llz5yz2.cloudfront.net/
```

- The frontend and API must use the same final deployed origins configured in:
  - Cognito callback URLs
  - Cognito sign-out URLs
  - API Gateway CORS

## Summary

This solution demonstrates:

- Secure user authentication with Amazon Cognito
- Protected serverless APIs using API Gateway and Lambda
- Public API consumption from Lambda
- Static frontend hosting with S3 and CloudFront
- A complete deployable stack using AWS CloudFormation

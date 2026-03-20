# aws-lambda-resize

Shared image resize pipeline for CloudFront + Lambda@Edge.

This repository currently contains:
- a `viewer-request` Lambda that rewrites image requests to alias targets
- an `origin-response` Lambda that generates missing resized variants from S3 originals
- a local Express harness that reuses the current Lambda business logic for development
- an optional Docker + nginx setup for local proxy testing

## Current Scope

- Runtime target: Node.js 24
- Current path convention: `medias/<site_code>/images/...`
- `site_code` is resolved from the path, not from the host
- Supported generated formats: `jpeg`, `webp`, `avif`
- Legacy `var/<site>/storage/images/...` paths are no longer supported by the runtime

## Repository Layout

- `lambda/viewer-request-function/`: CloudFront viewer-request function
- `lambda/origin-response-function/`: CloudFront origin-response function and its runtime dependencies
- `local-env/express-app/`: local app that injects the current Lambda business logic into HTTP routes
- `local-env/docker/`: optional nginx + node local environment
- `archives/`: historical docs and scripts kept for reference only

## Requirements

- Node.js 24 for local development
- Docker only if you want the optional local nginx + node setup
- AWS credentials with access to the target S3 bucket
- At least one real original image already present in S3 for end-to-end origin-response tests

The local harness is not fully offline: the origin-response flow still reads the original from S3 and may write generated variants back to S3.

## Local Development

### Direct run on your machine

```bash
cd local-env/express-app
npm install

# Either rely on the default AWS SDK credential chain
# (aws configure, env vars, SSO, etc.)
# or create a local credentials file from the example.
cp src/aws.credentials.example.json src/aws.credentials.json

# Recommended if the selected mock event does not contain a CloudFront S3 origin.
export BUCKET_NAME=xlanglois-us-media-main

npm start
```

Then open:
- `http://localhost:3420/status`
- `http://localhost:3420/viewer-request`
- `http://localhost:3420/origin-response`

Important notes:
- `npm start` regenerates `local-env/express-app/app.js` from the current Lambda sources each time.
- If you change Lambda code while the local server is already running, stop it and start it again.
- The `viewer-request` route can be exercised without S3, but `origin-response` needs a reachable original image.

### Update the local mock to a real S3 object

Before a meaningful origin-response test, update one of the mock files under:
- `local-env/express-app/src/mocks/origin-response/`

Use a real existing original path such as:
- `medias/idoldistrict/images/.../image.jpg`

If the mock event does not provide a CloudFront S3 origin domain, the app falls back to `BUCKET_NAME`.

## Optional Docker + nginx Local Setup

If you want the `dev.awsimg.dtd` host locally, add this entry to `/etc/hosts`:

```bash
127.0.0.1 dev.awsimg.dtd
```

Then start the containers:

```bash
cd local-env/docker
docker compose up -d
docker exec -it awsimg-node /bin/bash
cd /workspace/aws-lambda-resize/local-env/express-app
npm install
npm start
```

Then open:
- `http://dev.awsimg.dtd:420/status`
- `http://dev.awsimg.dtd:420/viewer-request`
- `http://dev.awsimg.dtd:420/origin-response`

## Packaging the Origin-Response Lambda

The `origin-response` function depends on `sharp`, so package its production dependencies in the Lambda Node 24 container image defined by the root `Dockerfile`.

```bash
docker build --tag awsimg-lambda-node24 .
docker run --rm --volume ${PWD}/lambda/origin-response-function:/build awsimg-lambda-node24 /bin/bash -lc "npm install --omit=dev"

rm -f dist/origin-response-function.zip
mkdir -p dist
cd lambda/origin-response-function && zip -FS -q -r ../../dist/origin-response-function.zip * && cd ../..
```

The generated archive is:
- `dist/origin-response-function.zip`

## Manual AWS Update

If you are still updating the function manually instead of via IaC:

```bash
aws lambda update-function-code \
  --function-name <origin-response-function-name> \
  --zip-file fileb://dist/origin-response-function.zip \
  --publish

aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

Lambda@Edge reminders:
- create and publish Lambda@Edge functions in `us-east-1`
- CloudFront associations must point to a published Lambda version, not `$LATEST`
- CloudFront ACM certificates must also be in `us-east-1`
- CloudFront should access S3 through OAC

## Project Status

Current repo focus:
- runtime alignment on `medias/<site_code>/images/...`
- local validation for `idoldistrict`
- preparing the path toward shared S3 + CloudFront + Lambda@Edge infrastructure

Not yet present in this repo:
- finished CDK bootstrap / infrastructure as code
- automated end-to-end tests against real AWS resources
- a complete deployment runbook for the final target architecture

## Historical Files

Older Node 8 era notes and scripts were moved to `archives/`.
They are kept only as historical reference and should not be used as the source of truth for the current workflow.





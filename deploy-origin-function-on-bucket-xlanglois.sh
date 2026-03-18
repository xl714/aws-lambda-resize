#!/bin/bash

# cd /projects/mfimg-aws-lambda-s3 ; ./deploy-origin-function-on-dev-bucket.sh

# TOPLEVEL_DIR=$(realpath $(dirname $0))
# echo $TOPLEVEL_DIR

cd /projects/mfimg-aws-lambda-s3

chmod -R 777 /projects/mfimg-aws-lambda-s3


#
# VIEWER REQUEST
#

cp -f /projects/aws-image-resize/lambda/src/viewer-request-function/index.js /projects/mfimg-aws-lambda-s3/lambda/viewer-request-function/index.js



#
# ORIGIN RESPONSE
#
cp -f /projects/aws-image-resize/lambda/src/origin-response-function/index.js-dist /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/index.js


sed -i 's@${DTD_ENV}@dev@g' /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/index.js
sed -i 's@${BUCKET_NAME}@us-est-n-virginia-bucket@g' /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/index.js

cp -rf /projects/aws-image-resize/lambda/src/origin-response-function/src /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/

chmod -R 777 /projects/mfimg-aws-lambda-s3

rm /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/.gitignore

#/projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/s3-manager.js

mv "/projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/s3-manager.js-dist" "/projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/s3-manager.js"

sed -i "s@//\s*AWS\.config\.loadFromPath@AWS.config.loadFromPath@g" /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/s3-manager.js
sed -i 's@${STORAGE_CLASS}@ONEZONE_IA@g' /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/s3-manager.js

cp -f /projects/mfimg-aws-lambda-s3/local-env/express-app/src/aws.credentials.xl714.json /projects/mfimg-aws-lambda-s3/lambda/origin-response-function/src/aws.credentials.json

chmod -R 777 /projects/mfimg-aws-lambda-s3

# docker build --tag amazonlinux:nodejs .
# docker run --rm --volume ${PWD}/lambda/origin-response-function:/build amazonlinux:nodejs /bin/bash -c "source ~/.bashrc; npm init -f -y; npm install sharp --save; npm install querystring --save; npm install --only=prod"

rm dist/origin-response-function.zip ;
mkdir -p dist && cd lambda/origin-response-function && zip -FS -q -r ../../dist/origin-response-function.zip * && cd ../.. ;
aws lambda update-function-code --function-name awsMfImgOriginResponseFunction --zip-file fileb://dist/origin-response-function.zip --publish


aws cloudfront create-invalidation --distribution-id EFJLENZBHHV06 --paths "/*"

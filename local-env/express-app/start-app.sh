#!/bin/bash

# cd /projects/mfimg-aws-lambda-s3/local-env/express-app ; ./start-app.sh

# TOPLEVEL_DIR=$(realpath $(dirname $0))
# echo $TOPLEVEL_DIR

chmod -R 777 /projects/mfimg-aws-lambda-s3

app_frame_file="/projects/mfimg-aws-lambda-s3/local-env/express-app/app-frame.js"
app_frame_tmp_file="/projects/mfimg-aws-lambda-s3/local-env/express-app/app-frame-tmp.js"
app_final_file="/projects/mfimg-aws-lambda-s3/local-env/express-app/app.js"


#
# VIEWER REQUEST
#

code=""
keep=false
while IFS='' read -r line; do
    if [[ $line == *"START_OF_BUSINESS_LOGIC_CODE"* ]]; then
        keep=true
    fi
    if [[ $line == *"END_OF_BUSINESS_LOGIC_CODE"* ]]; then
        keep=false
    fi
    if [ "$keep" = true ] ; then
        code+="${line}\n"
    fi
done < /projects/aws-image-resize/lambda/src/viewer-request-function/index.js

line_nb=$(grep -n 'VIEWER_REQUEST_CODE' $app_frame_file | cut -d ":" -f 1)
{ head -n $(($line_nb-1)) $app_frame_file; echo -e "$code"; tail -n +$(($line_nb+1)) $app_frame_file; } > $app_frame_tmp_file


#
# ORIGIN RESPONSE
#

code=""
keep=false
while IFS='' read -r line; do
    if [[ $line == *"START_OF_BUSINESS_LOGIC_CODE"* ]]; then
        keep=true
    fi
    if [[ $line == *"END_OF_BUSINESS_LOGIC_CODE"* ]]; then
        keep=false
    fi
    if [ "$keep" = true ] ; then
        code+="${line}\n"
    fi
done < /projects/aws-image-resize/lambda/src/origin-response-function/index.js-dist


line_nb=$(grep -n 'ORIGIN_RESPONSE_CODE' $app_frame_tmp_file | cut -d ":" -f 1)
{ head -n $(($line_nb-1)) $app_frame_tmp_file; echo -e "$code"; tail -n +$(($line_nb+1)) $app_frame_tmp_file; } > $app_final_file
rm $app_frame_tmp_file

sed -i 's@${DTD_ENV}@local@g' /projects/mfimg-aws-lambda-s3/local-env/express-app/app.js
sed -i 's@${BUCKET_NAME}@s3.dev.image-resize-898660402587-us-east-1@g' /projects/mfimg-aws-lambda-s3/local-env/express-app/app.js

cp -rf /projects/aws-image-resize/lambda/src/origin-response-function/src/* /projects/mfimg-aws-lambda-s3/local-env/express-app/src

mv /projects/mfimg-aws-lambda-s3/local-env/express-app/src/s3-manager.js-dist /projects/mfimg-aws-lambda-s3/local-env/express-app/src/s3-manager.js

sed -i "s@//\s*AWS\.config\.loadFromPath@AWS.config.loadFromPath@g" /projects/mfimg-aws-lambda-s3/local-env/express-app/src/s3-manager.js
sed -i 's@${STORAGE_CLASS}@ONEZONE_IA@g' /projects/mfimg-aws-lambda-s3/local-env/express-app/src/s3-manager.js

#
# START NODE SERVER
#

chmod -R 777 /projects/mfimg-aws-lambda-s3

#nodemon app.js
node app.js

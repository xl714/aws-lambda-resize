
## cli: pre-requirements 


    cd /projects/s3-event-lambda-nodejs/docker
    docker-compose up -d
    docker exec -it amazonlinux-node /bin/bash;

    aws configure


dev : my personal aws admin user infos in order to use aws-cli : 

    AKIA3SIPUBS3*******WH
    AHnGuFXEA**************Krgxg7k8/2
    us-east-1
    json

preprod et prod :

    AKIA5CPCVQ*********TY
    Jfcj70xu***/*****A9B2batWzz3YfDU023

prod : 

    eu-west-1

## console: create IAM role  with at least

CloudWatch Logs > Écrire 

S3 >  Lire, Écrire

 - dev : 

    AllowLambdaRole => arn:aws:iam::795138591926:role/AllowLambdaRole

 - preprod : 

    ImageResize-preprod-Shared-EdgeLambdaRole-10O7O4PQP93GI => arn:aws:iam::898660402587:role/service-role/ImageResize-preprod-Shared-EdgeLambdaRole-10O7O4PQP93GI

- prod : 

    ImageResize-prod-Shared-EdgeLambdaRole-14XOJPHLRUWCC => arn:aws:iam::898660402587:role/service-role/ImageResize-prod-Shared-EdgeLambdaRole-14XOJPHLRUWCC


## console: S3 bucket : allow IAM role to manipulate S3

S3 > us-est-n-virginia-bucket > permissions / autoristations > Stratégie de compartiment

    {
        "Version": "2012-10-17",
        "Id": "Policy1562834336042",
        "Statement": [
            {
                "Sid": "Stmt1562834333938",
                "Effect": "Allow",
                "Principal": {
                    "AWS": [
                        "arn:aws:iam::795138591926:role/AllowLambdaRole"
                    ]
                },
                "Action": "s3:*",
                "Resource": "arn:aws:s3:::us-est-n-virginia-bucket"
            }
        ]
    }


## cli: create layer

`lambdalayerffmpeg.zip` is a generated artifact. Keep it out of Git, build it locally, then upload it to S3 before publishing the Lambda layer version.


    curl -O https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
    tar xf ffmpeg-git-amd64-static.tar.xz
    rm ffmpeg-git-amd64-static.tar.xz
    mv ffmpeg-git-amd64-amd64-static ffmpeg

    zip -r lambdalayerffmpeg.zip ffmpeg/*


    unzip -vl lambdalayerffmpeg.zip

    output:
    Archive:  lambdalayerffmpeg.zip
    Length   Method    Size  Cmpr    Date    Time   CRC-32   Name
    --------  ------  ------- ---- ---------- ----- --------  ----
    75270088  Defl:N 29841019  60% 01-01-1980 00:00 0272aada  ffmpeg/ffmpeg
    75167880  Defl:N 29785943  60% 01-01-1980 00:00 9b1a79ec  ffmpeg/ffprobe
    35147  Defl:N    13657  61% 01-01-1980 00:00 6677f57c  ffmpeg/GPLv3.txt


### cli: upload layer on s3


    aws s3 cp lambdalayerffmpeg.zip s3://us-est-n-virginia-bucket/                         # DEV
    aws s3 cp lambdalayerffmpeg.zip s3://s3.preprod.image-resize-898660402587-us-east-1/   # PREPROD
    aws s3 cp lambdalayerffmpeg.zip s3://s3.prod.podcast.edisound/                         # PROD

( aws s3 cp lambdalayerffmpeg.zip s3://us-est-n-virginia-bucket/ --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=emailaddress=xavier.langlois@gmail.com )

    aws s3 ls s3://us-est-n-virginia-bucket                         # DEV
    aws s3 ls s3://s3.preprod.image-resize-898660402587-us-east-1   # PREPROD
    aws s3 ls s3://s3.prod.podcast.edisound                         # PROD


## cli: publish layer

dev:

    aws lambda publish-layer-version --layer-name ffmpeg --description "ffmpeg layer" --license-info "MIT" --content S3Bucket=us-est-n-virginia-bucket,S3Key=lambdalayerffmpeg.zip --compatible-runtimes nodejs12.x

preprod, 

    aws lambda publish-layer-version --layer-name ffmpeg --description "ffmpeg layer" --license-info "MIT" --content S3Bucket=s3.preprod.image-resize-898660402587-us-east-1,S3Key=lambdalayerffmpeg.zip --compatible-runtimes nodejs12.x

prod
    aws lambda publish-layer-version --layer-name ffmpeg --description "ffmpeg layer" --license-info "MIT" --content S3Bucket=s3.prod.podcast.edisound,S3Key=lambdalayerffmpeg.zip --compatible-runtimes nodejs12.x


    output:
    {
        "LayerVersionArn": "arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg:4",
        "Description": "ffmpeg layer",
        "CreatedDate": "2021-01-07T15:38:44.379+0000",
        "LayerArn": "arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg",
        "Content": {
            "CodeSize": 56593894,
            "CodeSha256": "dJwSTTauhq0UU8+GQXEpJ2SIDs5XBZPiQkZz3fEn0ks=",
            "Location": "https://example-bucket.s3.us-east-1.amazonaws.com/snapshots/example/ffmpeg.zip"
        },
        "Version": 4,
        "CompatibleRuntimes": [
            "nodejs12.x"
        ],
        "LicenseInfo": "MIT"
    }

    aws lambda list-layers

    output:
    {
        "Layers": [
            {
                "LayerName": "ffmpeg",
                "LayerArn": "arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg",
                "LatestMatchingVersion": {
                    "LayerVersionArn": "arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg:4",
                    "Description": "ffmpeg layer",
                    "LicenseInfo": "MIT",
                    "CreatedDate": "2021-01-07T15:38:44.379+0000",
                    "Version": 4,
                    "CompatibleRuntimes": [
                        "nodejs12.x"
                    ]
                }
            }
        ]
    }


## create lambda function : 

- DownsizeAudioLambdaFunction
- DownsizeAudioLambdaFunction-preprod
- DownsizeAudioLambdaFunction-prod


with : nodejs12.x runtime 

and : IAM role previously created : AllowLambdaRole

---------------------- START CODE ----------------------


'use strict';
    
    const ENV = 'preprod';
    
    const {spawnSync} = require('child_process');
    const {readFileSync, writeFileSync, unlinkSync, statSync} = require('fs');
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    exports.handler = async (event) => {
        
    
        if(ENV != "prod") console.log('-------- START function --------');
        
        if (!event.Records) {
            console.log('Error: Not an s3 invocation!');
            return;
        }
    
        for (const record of event.Records) {
            console.log("record", record);
            if (!record.s3) {
                console.log('Error: Not an s3 invocation!');
                continue;
            }
            
            if (! record.s3.object.key.endsWith('.mp3')) {
                console.log('Error: Only mp3');
                continue;
            }
            if (record.s3.object.key.endsWith('.downsized.mp3')) {
                if(ENV != "prod") console.log('Debug: already downsized');
                continue;
            }
    
            // get the file
            const s3Object = await s3
                .getObject({
                    Bucket: record.s3.bucket.name,
                    Key: record.s3.object.key,
                })
                .promise();
            
            const filename = record.s3.object.key.replace(/^.*[\\\/]/, '');
            
            // write file to disk
            writeFileSync(`/tmp/${filename}`, s3Object.Body);
    
            const kbitrate = '96';
            const bitrate = `${kbitrate}000`;
    
            if(ENV != "prod") console.log(`Debug: Next encode: ffmpeg -i /tmp/${filename} -ab ${bitrate} /tmp/${filename}.downsized.mp3`);
            spawnSync(
                '/opt/ffmpeg/ffmpeg',
                [
                    '-i',
                    `/tmp/${filename}`,
                    '-ab',
                    bitrate,
                    `/tmp/${filename}.downsized.mp3`,
                ],
                {stdio: 'inherit'}
            );
            
            if(ENV != "prod") console.log('encoding ended');
            
            const stats = statSync(`/tmp/${filename}.downsized.mp3`);
            const fileSizeInBytes = stats.size;
            if(ENV != "prod") console.log('stats', stats);
            if(ENV != "prod") console.log('fileSizeInBytes', fileSizeInBytes);
            if (fileSizeInBytes < 100) {
                console.log('Error: fileSizeInBytes < 100 !');
                return;
            }
            
            // read file from disk
            const newFile = readFileSync(`/tmp/${filename}.downsized.mp3`);
            // delete the temp files
            unlinkSync(`/tmp/${filename}.downsized.mp3`);
            unlinkSync(`/tmp/${filename}`);
            // upload file to s3
            const newKey = record.s3.object.key.replace(/\.[^/.]+$/, "");
            await s3
                .putObject({
                    Bucket: record.s3.bucket.name,
                    Key: `${newKey}.downsized.mp3`,
                    Body: newFile,
                    ACL: 'public-read',
                    ContentType: 'audio/mpeg'
                })
                .promise();
            if(ENV != "prod") console.log(`New file stored: ${newKey}.${kbitrate}kb.downsized.mp3`);
        }
        
        if(ENV != "prod") console.log('-------- END function --------');
    };


---------------------- / END CODE ----------------------


## console: save and deploy function 


## cli: configure lambda function to use our ffmpeg layer


cf : https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html#configuration-layers-manage

    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction --layers arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg:4
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-preprod --layers arn:aws:lambda:us-east-1:898660402587:layer:ffmpeg:1
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-prod --layers arn:aws:lambda:eu-west-1:898660402587:layer:ffmpeg:2

    output:
    {
        "Layers": [
            {
                "CodeSize": 56593894,
                "Arn": "arn:aws:lambda:us-east-1:795138591926:layer:ffmpeg:4"
            }
        ],
        "LastUpdateStatus": "Successful",
        "FunctionName": "DownsizeAudioLambdaFunction",
        "LastModified": "2021-01-07T15:47:24.550+0000",
        "RevisionId": "01800c87-ffd3-4d16-998b-727c5c1d4f65",
        "MemorySize": 128,
        "State": "Active",
        "Version": "$LATEST",
        "Role": "arn:aws:iam::795138591926:role/AllowLambdaRole",
        "Timeout": 3,
        "Runtime": "nodejs12.x",
        "TracingConfig": {
            "Mode": "PassThrough"
        },
        "CodeSha256": "1LbkWTlxbeGxWCDcSB1hyIcv/HzJ6W3w6sibCRvjfAU=",
        "Description": "",
        "CodeSize": 304,
        "FunctionArn": "arn:aws:lambda:us-east-1:795138591926:function:DownsizeAudioLambdaFunction",
        "Handler": "index.handler"
    }

## cli: configure lambda function timeout (if not: 3 secondes)

5 min

    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction --timeout 300
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-preprod --timeout 300
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-prod --timeout 300

512 Mo

    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction --memory-size 512
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-preprod --memory-size 512
    aws lambda update-function-configuration --function-name DownsizeAudioLambdaFunction-prod --memory-size 512


## console: configure lambda function event S3:OnObjectCeate


## console: tester la lambda


Event test json:

    {
        "Records" : [
            {
                "s3": {
                    "bucket": {
                        "name": "us-est-n-virginia-bucket"
                    },
                    "object": {
                        "key": "hqtest.mp3"
                    }
                }
            }
        ]
    }

preprod

    s3.preprod.image-resize-898660402587-us-east-1
    medias/episodes/audio/Grazia-detente.128kb.17.7Mo.mp3

prod
    s3.prod.podcast.edisound
    medias/episodes/audio/11b62127e1cdd00ac823341ffe4395f4df35c14313dcd8209fa24175cd5e.mp3


## note : il ne faut pas d'espace dans l'a clé (nom) du fichier sur S3


Pour un mp3 de 70Mo 192kb (51min d'écoute):

  - 128kb : traitement 4 min 30, Mémoire 459 MB => 47 Mo
  - 96kb  : traitement 5 min   , Mémoire 432 MB => 35 Mo


Preprod: Pour un mp3 de 17.7Mo 128kb (19min d'écoute):
  - 96kb  : traitement 1min 30 min   , Mémoire 261 MB => 13.5 Mo

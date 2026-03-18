# Local development and online deployment environment for AWS Lambda Edge functions

How it will work : Our sites will call that kind of image url :

`htt../var/pleinevie/storage/blabla/image.jpg?alias=cover&size=x50&format=webp`

1 - View Request Function will transform this url to :  

`htt../var/pleinevie/storage/blabla/image_cover_x50.webp?alias=cover&size=x50&format=webp&original=var/pleinevie/storage/blabla/image.jpg`

2 - Then Origin Response Function will :

- If the alias doesn't already exists on the S3 bucket (response status code != 200) :
      - get all parameters
      - fetch the original image from the bucket
      - apply all the transformations filters needed by the alias configuration
      - (asynchronously: store the new alias image on the bucket)
      - return the new image alias


> Optional note: I used this good tutorial for a good start:  [Serverless app for on-demand image processing](https://read.acloud.guru/serverless-image-optimization-and-delivery-510b6c311fe5)


## AWS Prerequisites

- S3 Bucket with an image on it (with public read access)
- IAM S3BucketUser
- AllowLambdaRole
- Cloudfront distribution

Check http://dokuwiki.digimondo.net/doku.php?id=aws-lambda-s3-images:mise_en_place_du_service for details

## Install

> Info: C'est c'est tout du Node v10

 - Install **[Docker](https://docs.docker.com/install/#server)** and **[Docker-compose](https://docs.docker.com/compose/install/)**.
 - Add this to your /etc/hosts file:
```bash
127.0.0.1 dev.mfawsimg.dtd
```

 - Then :
```bash

# get repository
git clone https://<my-git-name>:<mygit-password>@bitbucket.org/dtdmondadori/mfimg-aws-lambda-s3.git

cd mfimg-aws-lambda-s3/local-env/docker/

# Initialize and launch nginx and node containers
docker-compose up -d

#Check your running containers
docker ps -a

# Should output something like that :
CONTAINER ID        IMAGE                   COMMAND                  CREATED             STATUS              PORTS                         NAMES
7174a9052e15        docker_awsmfimg-nginx   "nginx"                  22 seconds ago      Up 21 seconds       0.0.0.0:80->80/tcp, 443/tcp   awsmfimg-nginx
33b71706346b        docker_awsmfimg-node    "/bin/bash /root/sta…"   23 seconds ago      Up 22 seconds       0.0.0.0:3001->3001/tcp        awsmfimg-node

# Enter node container
docker exec -it awsmfimg-node /bin/bash

# Check you are in the express-app directory
pwd

# Should output /projects/express-app, if not:
cd /projects/express-app

# Init
source ~/.bashrc

# eventualy in package.json put * instead of version and then :
npm update --save

npm install
# npm install => will install these :
# npm i aws-sdk body-parser sharp express

# exit the container
exit

# shutdown all containers
docker stop $(docker ps -a -q) && docker rm -v $(docker ps -a -q)

```
## How to code and test

```bash

cd mfimg-aws-lambda-s3/local-env/docker/

#  Start your nginx and node containers
docker-compose up -d

# Check your running containers
docker ps -a

# Enter node container
docker exec -it awsmfimg-node /bin/bash

# Go to your express-app directory
cd /projects/express-app

# Start your node server
# nodemon app.js  # ne suffit plus !
cd /projects/mfimg-aws-lambda-s3/local-env/express-app; 
./start-app.sh;

```
Now you can go to your test function
- [http://dev.mfawsimg.dtd/status](http://dev.mfawsimg.dtd/status)
- [http://dev.mfawsimg.dtd/viewer-request](http://dev.mfawsimg.dtd/viewer-request)
- [http://dev.mfawsimg.dtd/origin-response](http://dev.mfawsimg.dtd/origin-response)

> NOTE: If you need to make a change, there is a catch, when you save your edited js file, nodemon will crash => you just need to start it again ( `nodemon app.js`)  each time you make a change
> (if you know how to fix this, tell me)


## How to deploy

The directory tree in mfimg-aws-lambda-s3/local-env/express-app and mfimg-aws-lambda-s3/lambda

### Edit these files before

  * In all files in `mfimg-aws-lambda-s3/local-env/express-app/src/mocks/origin-response/*` replace `var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg` by the path to the image you put in your bucket

  * lambda/origin-response-function/index.js line 9 => set the real bucket name

``` javascript
const BUCKET = 'us-est-n-virginia-bucket-name-here';
```

  * aws.credentials.json => set real accessKeyId and secretAccessKey value of the S3BucketUser

``` javascript
{
    "accessKeyId": "REPLACE_WITH_AWS_ACCESS_KEY_ID",
    "secretAccessKey": "REPLACE_WITH_AWS_SECRET_ACCESS_KEY",
    "region": "us-east-1"
}
```

### Replicate your code
Because you can't use express on your Lambda edge functions, you have to take the code from inside
your express-app/app.js and put it in the real Lambda functions called eg mfImgViewerRequestFunction and mfImgOriginResponseFunction.

#### Lambda Request Viewer Function:

You can just copy-paste from your express app request-viewer route code to the
AWS  console > Lambda > mfImgViewerRequestFunction
Then > Save > Publish > Add trigger Cloudfront > Select ViewerRequest > Deploy

#### Lambda Origin Response Function

Because there are sharp and/or other node dependancies (in node_modules) : the source code is too heavy to put in AWS Console Lambda function editor.
So you have to
-  copy-paste from your express app origin-response route code inside your
mfimg-aws-lambda-s3/lambda/origin-response-function/index.js function
- add also the other new or updated files needed by your code (eg in src directory)

Then, as told in the tutorial https://aws.amazon.com/fr/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/


``` bash
cd mfimg-aws-lambda-s3
docker build --tag amazonlinux:nodejs .
docker run --rm --volume ${PWD}/lambda/origin-response-function:/build amazonlinux:nodejs /bin/bash -c "source ~/.bashrc; npm init -f -y; npm install sharp --save; npm install querystring --save; npm install --only=prod"

rm dist/origin-response-function.zip ;

mkdir -p dist && cd lambda/origin-response-function && zip -FS -q -r ../../dist/origin-response-function.zip * && cd ../.. ;
```
Très pratique **AWSCLI** :

``` bash
# la 1ère fois
apt-get install awscli
aws configure

# ensuite trop simple
# va mettre à jour la fontion
aws lambda update-function-code --function-name mfImgOriginResponseFunction --zip-file fileb://dist/origin-response-function.zip

#vider le cache cloudfront
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"

# mettre toutes les images du storage dans le bucket
aws s3 cp var/siteaccessdir s3://us-est-n-virginia-bucket/var/siteaccessdir
```

Au final, quand tout est prêt, quand je modifie je n'ai plus que ça à faire d'un seul copier-coller-entrer (--- prepare-lambda-function-for-upload ---)


``` bash

rm dist/origin-response-function.zip ;
mkdir -p dist && cd lambda/origin-response-function && zip -FS -q -r ../../dist/origin-response-function.zip * && cd ../.. ;
aws lambda update-function-code --function-name awsMfImgOriginResponseFunction --zip-file fileb://dist/origin-response-function.zip --publish
```

Mais ce n'est pas fini, une fois que c'est bien uploadé, ensuite il faut aller sur la fonction origin-response dans aws console lambda puis :

  - Aller sur la version précédente de la fonction lambda (liste déroulante en haut à droite)
  - Supprimer l'ancien trigger, puis "Save"
  - Aller sur la dernière version
  - Ajouter le bon trigger cloudfront et déployer
  - Attendre la fin du déploiement en checkant le status de la distribution CloudFront

Voilà






## Markdown language is cool

[https://stackedit.io/app#](https://stackedit.io/app#)

# Exemple pour origin-response en dev (idem pour le user en dev)

ne pas se mettre en root

``` bash

# install nodejs +8.10 and npm if needed

cd /projects/aws-image-resize/lambda/bin

./compile-function.sh dev origin-response

```

Cette commande va créer /projects/aws-image-resize/lambda/tmp/dev build et zip)

Si besoin (params du user iam.devs) faire un :

 ``` bash
aws configure

# AWS Access Key ID [None]: <your-access-key-id>
# AWS Secret Access Key [None]: <your-secret-access-key>
# Default region name [None]: us-east-1
# Default output format [None]: json

./list-functions.sh dev

# recupérer le nop de la fonctiopn

./update-function.sh dev origin-response <nom-de-foncrtion>

./update-function.sh dev origin-response ImageResize-dev-Shared-OriginResponseFunction-S4V60NUHZV32
```

response :

``` javascript
{
    "FunctionName": "ImageResize-dev-Shared-OriginResponseFunction-S4V60NUHZV32",
    "FunctionArn": "arn:aws:lambda:us-east-1:898660402587:function:ImageResize-dev-Shared-OriginResponseFunction-S4V60NUHZV32:8",
    "Runtime": "nodejs8.10",
    "Role": "arn:aws:iam::898660402587:role/service-role/ImageResize-dev-Shared-EdgeLambdaRole-10O7O4PQP93GI",
    "Handler": "index.handler",
    "CodeSize": 32251726,
    "Description": "",
    "Timeout": 5,
    "MemorySize": 512,
    "LastModified": "2019-11-20T14:51:04.774+0000",
    "CodeSha256": "g8jBftV7/QQebKsSFTfSYc6kfiLFt96D0Fo2Nqf82iY=",
    "Version": "8",
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "RevisionId": "a54c791d-cc1c-4141-8cef-8a6f09933583"
}
```

recuperer le no de version ici : 8

aller dans la console aws pour mettre ce numero dans

cloudfront > select le cloudfront > edit > beheaviours

dans le champ en face de "origin-response function" aller à la fin et changer le numéro de version > Save !

attendre que ça soit déployé

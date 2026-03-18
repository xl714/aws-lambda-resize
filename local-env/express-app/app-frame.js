/*
    https://read.acloud.guru/serverless-image-optimization-and-delivery-510b6c311fe5
    1rst time :
        source ~/.bashrc
        cd /projects/mfimg-aws-lambda-s3/local-env/express-app
        npm init
        npm i -D express body-parser
        npm i -S sharp
        npm i -S serverless-apigw-binary serverless-apigwy-binary
        npm i -g serverless
        npm i -g nodemon
    Next every time:
        cd /projects/mfimg-aws-lambda-s3/local-env/express-app ; ./start-app.sh
    Then go to http://dev.mfawsimg.dtd:420/status

    Projet Images sur S3 via Lambda Edge (aws-mfimg)
    - View Request Function transforme ça : (TODO)
        http://d1mzm0npacvjji.cloudfront.net/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg?alias=cover&size=x50&format=webp
        en
        http://d1mzm0npacvjji.cloudfront.net/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit_cover_x2.webp?alias=cover&size=x50&format=webp&original=var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg
    - Origin Response Function
        - récupère les parametres (OK)
        - récupérer l'image originale du bucket (OK)
        - applique les filtres par alias avec les parametres
        - stocke l'alias
        - retourne l'alias
        (image de test : https://us-est-n-virginia-bucket.s3.amazonaws.com/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg)

    - URL TEST :
        http://dev.mfawsimg.dtd:420/status
        # si fichier
        http://dev.mfawsimg.dtd:420/origin-response/alias-width400-not-exists-original-exists.js
        # si params dans url
        http://dev.mfawsimg.dtd:420/origin-response/false/panorama.jpg/exact1900x908_l
        http://dev.mfawsimg.dtd:420/origin-response/false/landscape.jpg/exact1024x768_l
        http://dev.mfawsimg.dtd:420/origin-response/false/portrait.jpg/true680x328
        http://dev.mfawsimg.dtd:420/origin-response/false/small.gif/width400
        http://dev.mfawsimg.dtd:420/origin-response/false/heavy-7mo.gif/width400

    Piste pour resizer les GIFs animés:
        https://ezgif.com/about >>> gifsicle and lossygif - making, optimizing, cutting, resizing animated GIFs
        https://github.com/lovell/sharp/issues/1823 <- sharp does not support animated gif resizing
        https://davidwalsh.name/resize-animated-gif
*/

const app = require('express')();

//
// False callback function to mock the aws one on local env
//
var functionRes = false;
const callback = (myVar = null, response = {varname: "varValue"}) => {
    console.log('callback response:', response);
    return functionRes.status(200).send(response).end();
};

app.get('/origin-response/:jsmockfile?/:original?/:alias?', (req, res) => {

    functionRes = res; // usefull to mock the aws callback() on local env

    //
    // False event objects to mock the aws one on local env
    //
    //const event = require('./src/mocks/origin-response/alias-exists');
    //const event = require('./src/mocks/origin-response/alias-scale-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/alias-scalewidth-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/alias-centercrop-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/alias-crop-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/alias-cropmore-not-exists-original-exists');
    // const event = require('./src/mocks/origin-response/alias-topcrop-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/alias-cover-not-exists-original-exists');
    //const event = require('./src/mocks/origin-response/originalx100jpeg.js');
    //const event = require('./src/mocks/origin-response/alias-not-conf.js');
    // const event = require('./src/mocks/origin-response/alias-exact1024x768_l-not-exists-original-exists.js');
    // const event = require('./src/mocks/origin-response/gif-alias-small.js');
    // const event = require('./src/mocks/origin-response/gif-to-webp-alias-small.js');

    console.log('req.params.jsmockfile ', req.params.jsmockfile);
    if(typeof req.params.jsmockfile != 'undefined'){

        if(typeof req.params.original != 'undefined'){
            var event = require('./src/mocks/origin-response/alias-not-exists-original-exists-default.js');
            let
                originalFileName = req.params.original,
                wantedAlias = req.params.alias,
                wantedFormat = 'webp'
            ;
            event.Records[0].cf.request.querystring = 'alias='+wantedAlias+'&size=x100&format='+wantedFormat+'&original=test-images/'+originalFileName;
            console.log('event', event);
        }
        else{
            console.log('req.params.jsmockfile 1 ', typeof req.params.jsmockfile);
            console.log('req.params.jsmockfile.toString() ', req.params.jsmockfile.toString());

            var event = require('./src/mocks/origin-response/'+req.params.jsmockfile.toString());
        }


    }else{
        console.log('req.params.jsmockfile 2 ', typeof req.params.jsmockfile);
        var event = require('./src/mocks/origin-response/alias-width400-not-exists-original-exists.js');
    }


    //
    // Starting compliant AWS code
    //

    ORIGIN_RESPONSE_CODE

    // end of aws lambda code

});



/*
    Transform :
    http://d1mzm0npacvjji.cloudfront.net/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg?alias=cover&size=x2&format=webp
    en
    http://d1mzm0npacvjji.cloudfront.net/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit_cover_x2.webp?alias=cover&size=x2&format=webp&original=var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg
*/
app.get('/viewer-request/:jsmockfile?', (req, res) => {
    functionRes = res; // usefull to mock the aws callback() on local env

    //
    // False event objects to mock the aws one on local env
    //
    // http://dev.mfawsimg.dtd:420/viewer-request/good-alias-url.js
    // http://dev.mfawsimg.dtd:420/viewer-request/good-original-url.js
    // http://dev.mfawsimg.dtd:420/viewer-request/gif.js

    console.log('req.params.jsmockfile ', req.params.jsmockfile);
    if(typeof req.params.jsmockfile != 'undefined'){
        console.log('req.params.jsmockfile 1 ', typeof req.params.jsmockfile);
        console.log('req.params.jsmockfile.toString() ', req.params.jsmockfile.toString());
        var event = require('./src/mocks/viewer-request/'+req.params.jsmockfile.toString());
    }else{
        console.log('req.params.jsmockfile 2 ', typeof req.params.jsmockfile);
        const event = require('./src/mocks/viewer-request/good-original-url');
    }


    //
    // Starting compliant AWS code => awsMfImgViewerRequestFunction
    //

    VIEWER_REQUEST_CODE

});





//let useragent = JSON.stringify(value);

app.get('/aws', (req, res) => {

    let request = event.Records[0].cf.request;
    let params = querystring.parse(request.querystring);

    // if there is no dimension attribute, just pass the response
    if (!params.d) {
        callback(null, response);
        return;
    }

    // read the dimension parameter value = width x height and split it by 'x'
    let dimensionMatch = params.d.split("x");

    // read the required path. Ex: uri /images/100x100/webp/image.jpg
    let path = request.uri;

    // read the S3 key from the path variable.
    // Ex: path variable /images/100x100/webp/image.jpg
    let key = path.substring(1);

    // parse the prefix, width, height and image name
    // Ex: key=images/200x200/webp/image.jpg
    let prefix, originalKey, match, width, height, requiredFormat, imageName;
    let startIndex;

    try {
        match = key.match(/(.*)\/(\d+)x(\d+)\/(.*)\/(.*)/);
        prefix = match[1];
        width = parseInt(match[2], 10);
        height = parseInt(match[3], 10);

        // correction for jpg required for 'Sharp'
        requiredFormat = match[4] == "jpg" ? "jpeg" : match[4];
        imageName = match[5];
        originalKey = prefix + "/" + imageName;
    }
    catch (err) {
        // no prefix exist for image..
        console.log("no prefix present..");
        match = key.match(/(\d+)x(\d+)\/(.*)\/(.*)/);
        width = parseInt(match[1], 10);
        height = parseInt(match[2], 10);

        // correction for jpg required for 'Sharp'
        requiredFormat = match[3] == "jpg" ? "jpeg" : match[3];
        imageName = match[4];
        originalKey = imageName;
    }

    // get the source image file
    S3.getObject({ Bucket: BUCKET, Key: originalKey })
        .promise()
        // perform the resize operation
        .then(
            data => Sharp(data.Body)
                .resize(width, height)
                .toFormat(requiredFormat)
                .toBuffer()
        )
        .then(
            buffer => {
                // save the resized object to S3 bucket with appropriate object key.
                S3.putObject({
                        Body: buffer,
                        Bucket: BUCKET,
                        ContentType: 'image/' + requiredFormat,
                        CacheControl: 'max-age=31536000',
                        Key: key,
                        StorageClass: 'STANDARD'
                    }).promise()
                    // even if there is exception in saving the object we send back the generated
                    // image back to viewer below
                    .catch(
                        () => {
                            console.log("Exception while writing resized image to bucket")
                        }
                    );

                    // generate a binary response with resized image
                    response.status = 200;
                    response.body = buffer.toString('base64');
                    response.bodyEncoding = 'base64';
                    response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/' + requiredFormat }];
                    callback(null, response);
        })
        .catch( err => {
            console.log("Exception while reading source image :%j",err);
        });

});


app.get('/fetch-image', (req, res) => {
    // const s3Manager = new S3Manager(BUCKET);
    const s3Manager = new S3Manager('us-est-n-virginia-bucket');

    console.log('>>>>> fetch-image');

    const imgSourceFile = req.query && req.query.f;
    const imgDestWidth = req.query && req.query.w;
    const imgDestHeight = req.query && req.query.h;

    console.log('BUCKET : ' + BUCKET);
    console.log('imgSourceFile : ' + imgSourceFile);
    console.log('imgDestWidth : ' + imgDestWidth);
    console.log('imgDestHeight : ' + imgDestHeight);


    return s3Manager
        .fetchImage(imgSourceFile)
        .then(data => {
            const img = new Buffer(data.image.buffer, 'base64');
            res.writeHead(200, {
                'Content-Type': data.contentType
            });
            res.end(img);
        })
        .catch(error => {
            console.error(error);
            res.status(400).send(error.message || error);
        });
});



const displayStatus = () => ({
    status: `OK`,
});

app.get('/status', (req, res) => {
    res.status(200).send(displayStatus());
});

const server = app.listen(3420, () =>
  console.log('Listening on ' + `http://dev.mfawsimg.dtd (port: ${server.address().port})`));

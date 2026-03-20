/*
    https://read.acloud.guru/serverless-image-optimization-and-delivery-510b6c311fe5
    Local run:
        cd local-env/express-app
        npm install
        npm start
    Then go to http://localhost:3420/status
    Or, with the optional nginx reverse proxy:
        http://dev.awsimg.dtd:420/status

    Projet Images sur S3 via Lambda Edge (aws-mfimg)
    - View Request Function transforme ça : (TODO)
        http://d1mzm0npacvjji.cloudfront.net/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg?alias=cover&size=x50&format=webp
        en
        http://d1mzm0npacvjji.cloudfront.net/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample_cover_x50.webp?alias=cover&size=x50&format=webp&original=medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg
    - Origin Response Function
        - récupère les parametres (OK)
        - récupérer l'image originale du bucket (OK)
        - applique les filtres par alias avec les parametres
        - stocke l'alias
        - retourne l'alias
        (image de test : https://us-est-n-virginia-bucket.s3.amazonaws.com/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg)

    - URL TEST :
        http://dev.awsimg.dtd:420/status
        # si fichier
        http://dev.awsimg.dtd:420/origin-response/alias-width400-not-exists-original-exists.js
        # si params dans url
        http://dev.awsimg.dtd:420/origin-response/false/panorama.jpg/exact1900x908_l
        http://dev.awsimg.dtd:420/origin-response/false/landscape.jpg/exact1024x768_l
        http://dev.awsimg.dtd:420/origin-response/false/portrait.jpg/true680x328
        http://dev.awsimg.dtd:420/origin-response/false/small.gif/width400
        http://dev.awsimg.dtd:420/origin-response/false/heavy-7mo.gif/width400

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

app.get(['/origin-response', '/origin-response/:jsmockfile', '/origin-response/:jsmockfile/:original', '/origin-response/:jsmockfile/:original/:alias'], (req, res) => {

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
            event.Records[0].cf.request.querystring = 'alias='+wantedAlias+'&size=x100&format='+wantedFormat+'&original=medias/idoldistrict/images/test-images/'+originalFileName;
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

    // START_OF_BUSINESS_LOGIC_CODE

    const isLambdaRuntime = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);
    const ENV = isLambdaRuntime ? 'prod' : (process.env.APP_ENV || process.env.ENV || 'dev');

    if(ENV != "prod") console.log('-------- origin-response-function --------');

    const querystring = require('node:querystring');

    const resolveBucket = (request) => {
        const origin = request.origin || {};
        const domainName = origin.s3 && origin.s3.domainName;

        if (domainName) {
            const separatorIndex = domainName.indexOf('.s3');
            if (separatorIndex > 0) {
                return domainName.slice(0, separatorIndex);
            }
        }

        return process.env.BUCKET_NAME || 'us-est-n-virginia-bucket';
    };

    const extractSiteCode = (resourcePath) => {
        const normalizedPath = String(resourcePath || '').replace(/^\/+/, '');

        const match = normalizedPath.match(/^medias\/([^/]+)\/images\//i);
        return match ? match[1] : null;
    };

    const loadConfAliases = (siteCode) => {
        if (!siteCode) {
            return {};
        }

        try {
            return require('./src/conf/aliases/conf-aliases-' + siteCode);
        }
        catch (error) {
            if (error.code == 'MODULE_NOT_FOUND' && error.message.includes('conf-aliases-' + siteCode)) {
                if(ENV != "prod") console.log('No site alias config found for siteCode:', siteCode);
                return {};
            }

            throw error;
        }
    };

    const Sharp = require('sharp');
    const S3Manager = require('./src/s3-manager');
    const ImageManager = require('./src/image-manager');
    const Conf = require('./src/conf/common');

    let response = event.Records[0].cf.response;
    if(ENV != "prod") console.log('response:', response);

    // cas des original appelées ou bien les alias déjà générés
    if (response.status == 200) {
        callback(null, response);
        return;
    }

    const normalizeFormat = (value) => {
        if (!value) {
            return value;
        }

        return value.toLowerCase() == "jpg" ? "jpeg" : value.toLowerCase();
    };

    let
        request = event.Records[0].cf.request,
        BUCKET = resolveBucket(request),
        s3Manager = new S3Manager(BUCKET),
        uri = request.uri,
        params = querystring.parse(request.querystring)
    ;

    if (!params.alias) {
        callback(null, response);
        return;
    }

    let
        alias = params.alias || 'original',
        size = params.size || 'x100',
        ratio = Conf.Sizes[size] || false,
        format = normalizeFormat(params.format || 'jpeg'),
        aliasKey = uri.replace(/^\/?(.*)$/g, '$1'),
        originalKey = params.original,
        siteCode = extractSiteCode(originalKey || uri),
        ConfAliases = loadConfAliases(siteCode)
    ;

    if(!ratio){
        if(ENV != "prod") console.log('Error: input size not allowed');
        response.status = 404; response.body = 'Error: input size not allowed';
        return callback(null, response);
    }

    // trouver le format d'origine via l'extension

    let findOriginalFormatRes = originalKey.match(/^.*\.([^\.]+)/i);
    if(!findOriginalFormatRes || findOriginalFormatRes.length < 2){
        if(ENV != "prod") console.log('Error: input format not found');
        response.status = 404; response.body = 'Error: input format not found';
        return callback(null, response);
    }
    let originalFormat = normalizeFormat(findOriginalFormatRes[1]);
    if(!Conf.Formats.includes(format)){
        if(ENV != "prod") console.log('Error: input format '+format+' not allowed');
        response.status = 404; response.body = 'Error: input format '+format+' not allowed';
        return callback(null, response);
    }

    let outputFormat = format;
    if(originalFormat == 'gif' && outputFormat != 'webp'){
        outputFormat = 'gif';
    }
    let contentType = 'image/' + outputFormat;

    if(ENV != "prod"){
        console.log('ENV: ', ENV); console.log('uri: ', uri); console.log('originalKey: ', originalKey); console.log('aliasKey: ', aliasKey); console.log('params: ', params);
        console.log('alias: ', alias, ', size: ', size, ', ratio: ', ratio, ', format: ', outputFormat, ', originalFormat: ', originalFormat, ', contentType: ', contentType, ', originalKey: ', originalKey, ', uri: ', uri, ', BUCKET: ', BUCKET);
    }

    if(!['png', 'jpeg', 'gif'].includes(originalFormat)){
        if(ENV != "prod") console.log('Error: input format '+originalFormat+' not handled');
        response.status = 404; response.body = 'Error: original format '+originalFormat+' not handled';
        return callback(null, response);
    }

    if(alias != 'original' && !Conf.Aliases[alias] && !ConfAliases[alias]){
        if(ENV != "prod") console.log('Error: alias '+alias+' != original  && !Conf.aliases[alias] && !ConfAliases[alias]');
        response.status = 404; response.body = 'Image "'+alias+'" non trouvée';
        return callback(null, response);
    }

    let aliasConf = (ConfAliases[alias]) ? ConfAliases[alias] : Conf.Aliases[alias];
    if(ENV != "prod") console.log('aliasConf', aliasConf);

    return s3Manager
        .fetchImage(originalKey)
        .then( data => {

            let imageManager = new ImageManager(Sharp, data.image);
            return new Promise((resolve, reject) => {

                if(originalFormat == 'gif' && outputFormat != 'webp'){
                    if(ENV != "prod") console.log('originalFormat == gif && format != webp >>> return original >>> resolve 0 data ', data.image);
                    return resolve(data.image);
                }

                // Ici on applique les filtres de l'alias les un après les autres
                if(alias != 'original' && originalFormat != 'gif')
                {
                    // for (var filter of Conf.AliasesForTest[alias].filters) // pour tester les transformations de base
                    for (var filter of aliasConf.filters)
                    {
                        if(ENV != "prod") console.log('Next: Calling imageManager.'+filter.name+'(filter.params: ', filter.params, ');');
                        imageManager[filter.name](filter.params);
                    }
                }
                else{
                    if(ENV != "prod") console.log('alias != original && format != gif >>> no resize');
                }

                // Ici on applique la mise au format webp si demandé
                if(outputFormat == 'webp'){
                    // https://sharp.pixelplumbing.com/en/stable/api-output/#webp
                    imageManager.sharp.webp({
                        quality: 80,
                        effort: 4
                    });
                    if(ENV != "prod") console.log("> imageManager.sharp.webp() >>> DONE");
                }
                else if(outputFormat == 'avif'){
                    imageManager.sharp.avif({
                        quality: 50,
                        effort: 4
                    });
                    if(ENV != "prod") console.log("> imageManager.sharp.avif(50) >>> DONE");
                }
                else if(outputFormat == 'jpeg'){
                    imageManager.sharp.jpeg({
                        quality: 80
                    });
                    if(ENV != "prod") console.log("> imageManager.sharp.jpeg(80) >>> DONE");
                }

                if(ENV != "prod") console.log('Next: generate final image');

                // une fois les filtres appliqués, il n'y a plus qu'à générer l'image finale
                imageManager.sharp
                    .toBuffer()
                    .then( data => {
                        if(ENV != "prod") console.log("> imageManager.sharp.toBuffer() 1 > DONE");
                        if(ratio == 1 || outputFormat == 'gif')
                        {
                            if(ENV != "prod") console.log('ratio == 1 || format == gif >>> resolve 1', data);
                            return resolve(data);
                        }
                        else{
                            // Ici on applique le pourcentage de la "size" demandée en fonction des canaux (mobile, tablette, ...)
                            if(ENV != "prod") console.log('Next resize to size: ', size);
                            imageManager = new ImageManager(Sharp, data);
                            imageManager.sharp
                                .metadata()
                                .then( metadata => {
                                    imageManager.sharp
                                        .resize( Math.round(metadata.width * ratio) )
                                        .toBuffer()
                                        .then(function(data) {
                                            if(ENV != "prod") console.log("> imageManager.sharp.toBuffer() 2 > DONE");
                                            if(ENV != "prod") console.log('resolve 2 - data: ', data);
                                            return resolve(data);
                                        })
                                        .catch(error => reject(error));
                                });
                        }
                    })
                    .catch(error => reject(error));
                }
            );
        }) // fin de fetchImage and transform
        .then( data => {

            if(ENV != "prod") console.log(">>> All DONE - data :", data);

            // Upload du nouvel alias sur le bucket if not original
            if(ENV != "prod") console.log("> Next: s3Manager.uploadImage if needed ...");
            if(
                ENV == "prod"
                &&
                ! ( outputFormat == originalFormat && size == 'x100' && alias == 'original' )
            ){
                s3Manager.uploadImage(aliasKey, data, contentType)
                    .catch(error => console.error("Exception while writing resized image to bucket: ", error));
                if(ENV != "prod") console.log("> s3Manager.uploadImage > LAUNCHED async");
            }
            else{
                if(ENV != "prod") console.log("> uploadImage not needed");
            }

            if(ENV != "prod") console.log(">>> Next: return image response");

            if(ENV == "local"){
                const img = Buffer.from(data.buffer, 'base64');
                res.writeHead(200, { 'Content-Type': contentType });
                if(ENV != "prod") console.log("ENV local response img", img);
                res.end(img);
            }
            else{
                response.status = 200;
                response.statusDescription = 'OK';
                response.bodyEncoding = 'base64';
                response.isBase64Encoded = true;
                response.headers['content-type'] = [{ key: 'Content-Type', value: contentType }];
                response.body = data.toString('base64');

                if(ENV != "prod") console.log("ENV " + ENV + " response");
                if(ENV != "prod") console.log(response);

                callback(null, response);
            }
        })
        .catch(error => {
            console.error(error);
            response.status = 404;
            response.body = 'Image non trouvée';
            callback(null, response);
        });

    // END_OF_BUSINESS_LOGIC_CODE

    // end of aws lambda code

});



/*
    Transform :
    http://d1mzm0npacvjji.cloudfront.net/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg?alias=cover&size=x2&format=webp
    en
    http://d1mzm0npacvjji.cloudfront.net/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample_cover_x50.webp?alias=cover&size=x50&format=webp&original=medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg
*/
app.get(['/viewer-request', '/viewer-request/:jsmockfile'], (req, res) => {
    functionRes = res; // usefull to mock the aws callback() on local env
    let event;

    //
    // False event objects to mock the aws one on local env
    //
    // http://dev.awsimg.dtd:420/viewer-request/good-alias-url.js
    // http://dev.awsimg.dtd:420/viewer-request/good-original-url.js
    // http://dev.awsimg.dtd:420/viewer-request/gif.js

    console.log('req.params.jsmockfile ', req.params.jsmockfile);
    if(typeof req.params.jsmockfile != 'undefined'){
        console.log('req.params.jsmockfile 1 ', typeof req.params.jsmockfile);
        console.log('req.params.jsmockfile.toString() ', req.params.jsmockfile.toString());
        event = require('./src/mocks/viewer-request/'+req.params.jsmockfile.toString());
    }else{
        console.log('req.params.jsmockfile 2 ', typeof req.params.jsmockfile);
        event = require('./src/mocks/viewer-request/good-original-url');
    }


    //
    // Starting compliant AWS code => awsMfImgViewerRequestFunction
    //

    // START_OF_BUSINESS_LOGIC_CODE

    console.log('-------- viewer-request-function --------');

    const querystring = require('node:querystring');

    const normalizeFormat = (value) => {
        if (!value) {
            return value;
        }

        return value.toLowerCase() == "jpg" ? "jpeg" : value.toLowerCase();
    };

    let
        request = event.Records[0].cf.request,
        uri = request.uri,
        params = querystring.parse(request.querystring),
        alias = params.alias || 'original',
        size = params.size || 'x100',
        format = normalizeFormat(params.format || 'jpeg')
    ;

    // si on veut vraiment l'originale
    if (!params.alias && !params.size && !params.format) {
        callback(null, request);
        return;
    }

    let findOriginalFormatRes = uri.match(/^.*\.([^\.]+)/i);
    if(findOriginalFormatRes && findOriginalFormatRes.length >= 2){
        let originalFormat = normalizeFormat(findOriginalFormatRes[1]);

        if(originalFormat == 'gif' && format != 'webp'){
            callback(null, request);
            return;
        }

        if (format == originalFormat && alias == 'original' && size == 'x100') {
            callback(null, request);
            return;
        }
    }

    console.log('uri: ', uri); console.log('params: ', params);
    console.log('alias: ', alias, ', size: ', size, ', format: ', format);
    //return callback(null, response);

    // trim first / in uri
    let originalPath = uri.replace(/^\/?(.*)$/g, '$1');

    // remove extension to prepare new uri
    let newUri = uri.replace(/^(.*)\.[^\.]+$/g, '$1');

    // add alias params to construct new uri
    newUri += '_' + alias + '_' + size + '.' + format;

    request.uri = newUri;
    request.querystring = querystring.stringify({
        alias,
        size,
        format,
        original: originalPath
    });

    console.log('request: ', request);

    callback(null, request);

    // END_OF_BUSINESS_LOGIC_CODE

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
  console.log('Listening on ' + `http://localhost:${server.address().port}`));

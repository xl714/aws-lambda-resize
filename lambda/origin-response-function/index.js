'use strict';

exports.handler = (event, context, callback) => {

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

};

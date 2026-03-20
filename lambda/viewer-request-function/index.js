'use strict';

exports.handler = (event, context, callback) => {

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
};

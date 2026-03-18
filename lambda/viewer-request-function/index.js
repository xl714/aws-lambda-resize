'use strict';

exports.handler = (event, context, callback) => {

    // START_OF_BUSINESS_LOGIC_CODE

    console.log('-------- viewer-request-function --------');

    const querystring = require('querystring');

    let
        request = event.Records[0].cf.request,
        uri = request.uri,
        params = querystring.parse(request.querystring),
        alias = params.alias || 'original',
        size = params.size || 'x100',
        format = params.format || 'jpeg'
    ;
    format = format == "jpg" ? "jpeg" : format;

    // si on veut vraiment l'originale
    if (!params.alias && !params.size && !params.format) {
        callback(null, request);
        return;
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
    request.querystring = 'alias=' + alias + '&size=' + size+ '&format=' + format + '&original=' + originalPath;

    console.log('request: ', request);

    callback(null, request);

    // END_OF_BUSINESS_LOGIC_CODE
};

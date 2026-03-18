const querystring = require('querystring');

exports.handler = (event, context, callback) => {

    console.log('-------- origin-response-function --------');
    console.log('event:', event);
    console.log('context:', context);
    console.log('callback:', callback);


    let request = event.Records[0].cf.request;

    let params = querystring.parse(request.querystring);
    console.log('params:', params);

    let uri = request.uri;
    console.log('uri:', uri);

    //let finalrequest = JSON.stringify(request);
    let headers = request.headers;
    let useragent = JSON.stringify(headers["user-agent"][0].value);

    let strIsMobile = "Is not mobile";
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(useragent)) {
        strIsMobile = "Is not mobile";
    }

    let content = `
    <\!DOCTYPE html>
    <html lang="en">
       <head>
          <meta charset="utf-8">
          <title>Simple Lambda@Edge Static Content Response</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
       </head>
       <body>
          <h1>Infos:</h1>
          Uri:`+ uri +` <br/>
          Alias:`+ params.alias +` <br/>
          Size:`+ params.size +` <br/>
          Format:`+ params.format +` <br/>
          Page:`+ strIsMobile +` <br/>
          User agent:`+ useragent +` <br/>
       </body>
    </html>
`;

    const response = event.Records[0].cf.response;
    console.log('response:', response);
    console.log('response.body:', response.body);

    response.status = 200;
    response.statusDescription = 'OK';
    response.body = content;

    callback(null, response);
};

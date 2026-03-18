module.exports = {
    "Records": [
        {
            "cf": {
                "request": {
                    "uri": "/var/ssn/path/to/none/existing/image/alias_x100.jpeg",
                    "querystring": "alias=aliasname&size=x100&format=webp&original=path/to/final/image/file/image.jpg"
                },
                "response": {
                    "status": "404",
                    "statusDescription": "Not Found" /*OK*/
                }
            }
        }
    ]
}

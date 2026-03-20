module.exports = {
    "Records": [
        {
            "cf": {
                "config": {
                    "distributionId": "EXAMPLE"
                },
                "request": {
                    "headers": {
                        "user-agent": [
                            {
                                "value": "Android"
                            }
                        ]
                    },
                    "uri": "/medias/idoldistrict/images/1/7/2/172215/idoldistrict-sample.jpg",
                    "querystring": "alias=cover&size=x50&format=webp"
                },
                "response": {
                    "status": "200",
                    "statusDescription": "OK",
                    "headers": {
                        "vary": [
                            {
                                "key": "Vary",
                                "value": "*"
                            }
                        ],
                        "last-modified": [
                            {
                                "key": "Last-Modified",
                                "value": "2016-11-25"
                            }
                        ],
                        "x-amz-meta-last-modified": [
                            {
                                "key": "X-Amz-Meta-Last-Modified",
                                "value": "2016-01-01"
                            }
                        ]
                    },
                    "body" : "Image content !"
                }
            }
        }
    ]
}

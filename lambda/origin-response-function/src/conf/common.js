module.exports = {

    AppVersion: 'v0001',

    // en pourcentage
    Sizes: {
        "x100": 1,      // 100% pour le format original
        "x75": 0.75,    // 75% pour les tablettes
        "x50": 1/2,     // 50% pour les mobiles par exemple
        "x33": 1/3      // 1/3 de la taille
    },

    Formats: [
        'jpeg',
        'webp'
    ],

    Aliases: {
        "width400": {
            "filters": [
                {
                    "name": "scalewidth",
                    "params": {
                        "width": 400
                    }
                }
            ]
        },
        "true680x328": { // newsletter probance (seuls des images paysages sont utilisées donc peu ou pas de perte au crop)
            "filters": [
                {
                    "name": "exact_resized_cropped",
                    "params": {
                        "width": 680,
                        "height": 328
                    }
                }
            ]
        },
        "true310x170": { // newsletter probance (seuls des images paysages sont utilisées donc peu ou pas de perte au crop)
            "filters": [
                {
                    "name": "exact_resized_cropped",
                    "params": {
                        "width": 310,
                        "height": 170
                    }
                }
            ]
        }
    },

    AliasesForTest: {
        "scale": {
            "filters": [
                {
                    "name": "scale",
                    "params": {
                        "width": 500,
                        "height": 250
                    }
                }
            ]
        },
        "scaledownonly": {
            "filters": [
                {
                    "name": "scaledownonly",
                    "params": {
                        "width": 1200,
                        "height": 250
                    }
                }
            ]
        },
        "scalewidth": {
            "filters": [
                {
                    "name": "scalewidth",
                    "params": {
                        "width": 500
                    }
                }
            ]
        },
        "scaleheight": {
            "filters": [
                {
                    "name": "scaleheight",
                    "params": {
                        "height": 500
                    }
                }
            ]
        },
        "centercrop": {
            "filters": [
                {
                    "name": "centercrop",
                    "params": {
                        "width": 400,
                        "height": 300
                    }
                }
            ]
        },
        "crop": {
            "filters": [
                {
                    "name": "crop",
                    "params": {
                        "width": 500,
                        "height": 250,
                        "top": 0,
                        "left": 0
                    }
                }
            ]
        },
        "cropmore": {
            "filters": [
                {
                    "name": "cropmore",
                    "params": {
                        "width": 500,
                        "height": 250,
                        "top": 0,
                        "left": 0
                    }
                }
            ]
        },
        "topcrop": {
            "filters": [
                {
                    "name": "topcrop",
                    "params": {
                        "width": 500,
                        "height": 250
                    }
                }
            ]
        },
        "block3items3": {
            "filters": [
                {
                    "name": "scalewidth",
                    "params": {
                        "width": 195
                    }
                },{
                    "name": "crop",
                    "params": {
                        "width": 195,
                        "height": 98,
                        "top": 0,
                        "left": 0
                    }
                }
            ]
        }
    },

    myfunc: function (myparam) {
        return myparam in [1,2,3];
    }
};

// exemple d'url appelée :
/*
Sur le S3
https://us-est-n-virginia-bucket.s3.amazonaws.com/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg
Cloudfront en direct sur le s3
https://d15b1l28s4saob.cloudfront.net/var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit.jpg

var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit?alias=<alias_name>&size=Size1&format=jpeg
var/pleinevie/storage/images/1/7/2/172215/les-francais-dorment-min-moyenne-par-nuit_<alias_name>_Size1.jpg


/*
    [geometry/centercrop] => -geometry %1x%2^ -gravity center -crop %1x%2+0+0 +repage
    [geometry/clean] => -strip -interlace Plane
    [geometry/crop] => -crop %1x%2+%3+%4
    [geometry/cropmore] => -gravity center -crop %1x%2+%3+%4 +repage
    [geometry/scale] => -geometry %1x%2
    [geometry/scaledownonly] => -geometry %1x%2>
    [geometry/scaleheight] => -geometry x%1
    [geometry/scalewidth] => -geometry %1
    [geometry/topcrop] => -geometry %1x%2^ -crop %1x%2+0+0 +repage
*/

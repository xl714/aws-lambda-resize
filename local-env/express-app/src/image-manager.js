class ImageManager
{
    constructor(Sharp, image) {
        this.Sharp = Sharp;
        const input = Buffer.isBuffer(image) ? image : Buffer.from(image);
        this.sharp = Sharp(input, { pages: -1 });
    }

    // resize à la plus petite des 2 tailles
    scale(params){
        params.fit = "inside" // conserve le ratio & prend redimensionne à la taille la plus petite
        this.sharp.resize(params); // 500;250
        console.log('ImageManager.scale > params: ', params);
        return this;
    }

    scaledownonly(params){
        params.fit = "inside", // conserve le ratio & prend redimensionne à la taille la plus petite
        params.withoutEnlargement = true // empeche l'agrandissement
        this.sharp.resize(params); // 500;500
        console.log('ImageManager.scaledownonly > params: ', params);
        return this;
    }

    scalewidth(params){
        this.sharp.resize({
            width: params.width
        }); // 500
        console.log('ImageManager.scalewidth > params: ', params);
        return this;
    }

    scaleheight(params){
        this.sharp.resize({
            height: params.height
        }); // 500
        console.log('ImageManager.scaleheight > params: ', params);
        return this;
    }

    crop(params){
        // yes ... it is the same as scaledownonly ...
        let paramsResize = {
            fit: "inside",
            width: params.width,
            height: params.height,
            withoutEnlargement : true
        };
        console.log('ImageManager.crop > resize params: ', paramsResize);
        this.sharp
            .resize(paramsResize);
        return this;
    }

    exact_resized_cropped(params){
        let paramsResize = {
            fit: "cover",
            position: 'attention',
            width: params.width,
            height: params.height
        };
        console.log('ImageManager.exact_resized_cropped > resize params: ', paramsResize);
        this.sharp
            .resize(paramsResize);
        return this;
    }

    centercrop(params){
        params.fit = "cover"; // crop if needed in the center
        this.sharp.resize(params); // 400;300
        console.log('ImageManager.centercrop > params: ', params);
        return this;
    }

    topcrop(params){
        params.fit = "cover"; // crop if needed from the center
        params.position = "top"; // then will crop from top
        this.sharp.resize(params); // 500;250
        console.log('ImageManager.topcrop > params: ', params);
        return this;
    }

    // celui là je n'y arrive pas >> voir avec le nouveau ImageManager.crop
    cropmore(params){
        this.sharp.resize({
            width: params.width,
            height: params.height,
            top: params.top,
            left: params.left
        }); // 500;250;0;0
        console.log('ImageManager.cropmore > params: ', params);
        return this;
    }

    // only for tests, not used on PROD env
    resize(image, size, quality)
    {
        if (!image) throw new Error('An Image must be specified');
        if (!size) throw new Error('Image size must be specified');
        console.log('ImageManager.resize > size: ', size);
        return new Promise((res, rej) => {
            this
                .Sharp(Buffer.isBuffer(image) ? image : Buffer.from(image))
                .resize(size.w, size.h)
                .webp({quality: quality})
                .toBuffer()
                .then(data => {
                    console.log('ImageManager.resize DONE');
                    return res({
                        image: data,
                        contentType: 'image/webp',
                    });
                })
                .catch(err => rej(err))
            });
    }
}

module.exports = ImageManager;

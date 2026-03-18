const AWS = require('aws-sdk');
//AWS.config.update({region: 'us-east-1'});
AWS.config.loadFromPath('./src/aws.credentials.json');


const getFromS3 = (s3, bucketName, fileName) =>
    new Promise((resolve, reject) => {
        s3.getObject({
            Bucket: bucketName,
            Key: fileName
        },
        (error, data) => {
            if (error) {
                return reject(error);
            }
            const contentType = data.ContentType;
            const image = data.Body;
            return resolve({ image, contentType });
        });
    }
);

class S3Manager
{
    constructor(bucketName) {
        this.S3 = new AWS.S3();
        this.bucketName = bucketName;
    }

    fetchImage(fileName) {
        if (!fileName) {
            return Promise.reject('Filename not specified');
        }
        return Promise.resolve(
            getFromS3(this.S3, this.bucketName, fileName)
        );
    }

    uploadImage(key, data, contentType) {
        if (!key) { return Promise.reject('image data not specified'); }
        if (!data) { return Promise.reject('image key not specified'); }
        if (!contentType) { return Promise.reject('image contentType not specified'); }
        this.S3.putObject(
            {
                Body: data,
                Bucket: this.bucketName,
                ContentType: contentType,
                CacheControl: 'max-age=31536000',
                Key: key,
                StorageClass: 'ONEZONE_IA',
                ACL: 'public-read'
            },
            function(error, data) {
                if (error) {
                    console.log("Exception while writing resized image to bucket: ", error);
                } else {
                    console.log('Writing resized image to bucket: success');
                }
            }
        );
    }
}

module.exports = S3Manager;

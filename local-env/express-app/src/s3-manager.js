const fs = require('node:fs');
const path = require('node:path');
const {
    GetObjectCommand,
    PutObjectCommand,
    S3Client
} = require('@aws-sdk/client-s3');

const getS3Config = () => {
    const config = {
        region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
    };
    const credentialsPath = path.join(__dirname, 'aws.credentials.json');

    if (!fs.existsSync(credentialsPath)) {
        return config;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    if (credentials.region) {
        config.region = credentials.region;
    }
    if (credentials.accessKeyId && credentials.secretAccessKey) {
        config.credentials = {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey
        };
    }

    return config;
};

const streamToBuffer = async (body) => {
    if (!body) {
        return Buffer.alloc(0);
    }
    if (Buffer.isBuffer(body)) {
        return body;
    }
    if (typeof body.transformToByteArray === 'function') {
        return Buffer.from(await body.transformToByteArray());
    }

    const chunks = [];
    for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
};

class S3Manager
{
    constructor(bucketName) {
        this.S3 = new S3Client(getS3Config());
        this.bucketName = bucketName;
    }

    async fetchImage(fileName) {
        if (!fileName) {
            return Promise.reject('Filename not specified');
        }
        const data = await this.S3.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: fileName
        }));

        return {
            image: await streamToBuffer(data.Body),
            contentType: data.ContentType
        };
    }

    async uploadImage(key, data, contentType) {
        if (!key) { return Promise.reject('image data not specified'); }
        if (!data) { return Promise.reject('image key not specified'); }
        if (!contentType) { return Promise.reject('image contentType not specified'); }
        await this.S3.send(new PutObjectCommand({
            Body: data,
            Bucket: this.bucketName,
            ContentType: contentType,
            CacheControl: 'max-age=31536000',
            Key: key,
            StorageClass: 'ONEZONE_IA',
            ACL: 'public-read'
        }));
        console.log('Writing resized image to bucket: success');
    }
}

module.exports = S3Manager;

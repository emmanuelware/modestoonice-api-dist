"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
class S3Service {
    static fetchBucketObjects(bucketName, s3Instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const objs = yield new Promise((resolve, reject) => {
                s3Instance.listObjects({
                    Bucket: bucketName
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data.Contents.filter(obj => {
                            if (obj.Size > 1024) {
                                return obj;
                            }
                        }));
                    }
                });
            });
            return objs;
        });
    }
    static fetchBucketObjectsByPrefix(bucketName, prefix, s3Instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const objs = yield new Promise((resolve, reject) => {
                s3Instance.listObjects({
                    Bucket: bucketName,
                    Prefix: prefix
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data.Contents.filter(obj => {
                            if (obj.Size > 1024)
                                return obj;
                        }));
                    }
                });
            });
            return objs;
        });
    }
    static deleteBucketObjectByKey(bucket, key, s3Instance) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                s3Instance.deleteObject({
                    Bucket: bucket,
                    Key: key
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    static addMediaBucketObject(bucketName, keyName, fileExtension, body, s3Instance, contentType, contentEncoding) {
        return __awaiter(this, void 0, void 0, function* () {
            const obj = yield new Promise((resolve, reject) => {
                s3Instance.putObject({
                    Bucket: bucketName,
                    Key: keyName + '.' + fileExtension,
                    Body: body,
                    ContentType: contentType || null,
                    ContentEncoding: contentEncoding || null
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
            return obj;
        });
    }
    static getSignedUrl(bucketName, keyName, s3Instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield new Promise((resolve, reject) => {
                s3Instance.getSignedUrl('getObject', {
                    Bucket: bucketName,
                    Key: keyName
                }, (err, url) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(url);
                    }
                });
            });
            return url;
        });
    }
    static copyObject(sourceBucket, sourceKey, destinationBucket, destinationKey, s3Instance, _options) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                metadata: null
            };
            if (_options) {
                if (_options.metadata) {
                    options.metadata = _options.metadata;
                }
            }
            return new Promise((resolve, reject) => {
                s3Instance.copyObject({
                    Bucket: destinationBucket,
                    CopySource: sourceBucket + '/' + sourceKey,
                    Key: destinationKey,
                    Metadata: options.metadata || null
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    static createS3Instance() {
        return new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            signatureVersion: 'v4'
        });
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=S3Service.js.map
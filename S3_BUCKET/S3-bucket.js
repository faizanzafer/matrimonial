const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4 } = require("uuid");
const { getEnv } = require("../config");

const ID = getEnv("S3_ID");
const SECRET = getEnv("S3_SECRET");
const BUCKET_NAME = getEnv("S3_BUCKET_NAME");
// const name = v4().jpeg;

AWS.config.update({
  region: getEnv("S3_REGION"),
});

const wasabiEndpoint = new AWS.Endpoint("s3.ap-northeast-2.wasabisys.com");

const s3 = new AWS.S3({
  endpoint: wasabiEndpoint,
  region: AWS.config.region,
  accessKeyId: ID,
  secretAccessKey: SECRET,
});

function uploadFile(file) {
  if (file && file.path) {
    const fileContent = fs.createReadStream(file.path);
    // console.log(file);
    // Setting up S3 upload parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: v4(), // File name you want to save as in S3
      Body: fileContent,
      ContentEncoding: "base64",
      ContentType: file?.mimetype,
      ACL: "public-read",
    };

    // Uploading files to the bucket
    return s3.upload(params).promise();
  }

  return {};
}

const deleteFile = (fileUrl) => {
  if (fileUrl) {
    const splitedFileUrl = fileUrl.split("/");

    const params = {
      Bucket: BUCKET_NAME,
      Key: splitedFileUrl[splitedFileUrl.length - 1], // File name you want to save as in S3
    };

    return s3.deleteObject(params).promise();
  }
  return {};
};

module.exports = { uploadFile, deleteFile };

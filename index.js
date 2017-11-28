var AWS = require('aws-sdk');
var request = require('request');
const stream = require('stream');

function uploadToS3(s3, params, cb) {
  var pass = new stream.PassThrough();
  params = Object.assign(params, { Body: pass });
  s3.upload(params)
    .send(function(err, data) {
      if (err) {
        cb(err, data);
      }
      if (data && data.Location) {
        cb(null, data.Location); // data.Location is the uploaded location
      } else {
        cb(new Error("data.Location not found!"), data);
      }
    });
  return pass;
};

/**
 * Curry callback function with content length and type
 * @param {function} originalCallback - callback accepting err & data args
 * @return {function} - curried callback function returning object w/ data
 */
function curryCallback(originalCallback, contentLength, contentType) {
  return function(err, location) {
    if (err) {
      return originalCallback(err);
    }
    return originalCallback(err, {
      contentLength: contentLength,
      contentType: contentType,
      location: location,
    });
  }
}

/**
 * @param {string} url
 * @param {string} bucketName - Name of the bucket to which the PUT operation was initiated.
 * @param {string} itemKey - Object key for which the PUT operation was initiated.
 * @param {object} params - AWS Javascript SDK S3 .upload() params. Parameters - http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
 * @param {string} params.ACL - The canned ACL to apply to the object. Possible values include:
 *   "private"
 *   "public-read"
 *   "public-read-write"
 *   "authenticated-read"
 *   "aws-exec-read"
 *   "bucket-owner-read"
 *   "bucket-owner-full-control"
 * @callback callback function(err, data)
 *   @param err [Error] an error or null if no error occurred.
 *   @param data [map] The response data from the successful upload:
 *   @param data.Location [String] the URL of the uploaded object
 *   @param data.ETag [String] the ETag of the uploaded object
 *   @param data.Bucket [String]  the bucket to which the object was uploaded
 *   @param data.Key [String] the key to which the object was uploaded
 */
exports.urlToS3 = function(url, bucketName, itemKey, uploadParams, callback) {
  if (typeof uploadParams === 'function' && callback === undefined)  {
    callback = uploadParams;
    uploadParams = null;
  }

  var s3 = new AWS.S3({
    params: {
      Bucket: bucketName,
      Key: itemKey
    },
    apiVersion: '2006-03-01'
  });
  var req = request.get(url);
  req.pause();
  req.on('response', function(res) {
    if (res.statusCode == 200) {
      var contentLength = res.headers['content-length'];
      var contentType = res.headers['content-type'];
      var ccb = curryCallback(callback, contentLength, contentType);

      uploadParams = uploadParams || {};
      uploadParams = Object.assign(uploadParams, {
        contentLength: contentLength,
        contentType: contentType,
      });
      req.pipe(uploadToS3(s3, uploadParams, ccb));
      req.resume();
    } else {
      callback(new Error('request item did not respond with HTTP 200'));
    }
  });
}

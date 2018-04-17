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
 * @param {string} contentLength - Size of the body in bytes. This parameter is useful when the size of the body cannot be determined automatically.
 * @param {string} contentType -  A standard MIME type describing the format of the object data.
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
 * @param {object} uploadParams - AWS Javascript SDK S3 .upload() params. Parameters - http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
 * @param {string} uploadParams.ACL - The canned ACL to apply to the object. Possible values include:
 *   "private"
 *   "public-read"
 *   "public-read-write"
 *   "authenticated-read"
 *   "aws-exec-read"
 *   "bucket-owner-read"
 *   "bucket-owner-full-control"
 * @param {object} credentials - AWS Javascript SDK config credentials params. Parameters - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html
 * @param {string} credentials.accessKeyId - your AWS access key ID.
 * @param {string} credentials.secretAccessKey - your AWS secret access key.
 * @callback callback function(err, data)
 *   @param err [Error] an error or null if no error occurred.
 *   @param data [map] The response data from the successful upload:
 *   @param data.location [String] the URL of the uploaded object
 *   @param {string} data.contentLength - Size of the body in bytes. This parameter is useful when the size of the body cannot be determined automatically.
 *   @param {string} data.contentType -  A standard MIME type describing the format of the object data.
 */
exports.urlToS3 = function(url, bucketName, itemKey, uploadParams, credentials, callback) {
  if (typeof uploadParams === 'function' && callback === undefined)  {
    callback = uploadParams;
    uploadParams = null;
  }

  if (typeof credentials === 'function' && callback === undefined)  {
    callback = credentials;
    credentials = null;
  }

  var req = request.get(url);
  req.pause();
  req.on('response', function(res) {
    if (res.statusCode == 200) {
      if (credentials) {
        AWS.config.update(credentials);
      }
      var s3 = new AWS.S3({ apiVersion: '2006-03-01' });

      var contentLength = res.headers['content-length'];
      var contentType = res.headers['content-type'];
      var ccb = curryCallback(callback, contentLength, contentType);

      uploadParams = uploadParams || {};
      uploadParams = Object.assign({
        Bucket: bucketName,
        Key: itemKey,
        ContentLength: contentLength,
        ContentType: contentType,
      }, uploadParams);
      req.pipe(uploadToS3(s3, uploadParams, ccb));
      req.resume();
    } else {
      callback(new Error('request item did not respond with HTTP 200'));
    }
  });
}

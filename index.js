var AWS = require('aws-sdk');
var request = require('request');
const stream = require('stream');

function uploadToS3(s3, cb) {
  var pass = new stream.PassThrough();
  var params = {Body: pass};
  s3.upload(params)
    .send(function(err, data) {
      // console.log(err, data)
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

exports.urlToS3 = function(url, bucketName, itemKey, callback) {
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
      req.pipe(uploadToS3(s3, ccb));
      req.resume();
    } else {
      callback(new Error('request item did not respond with HTTP 200'));
    }
  });
}

var AWS = require('aws-sdk');
var request = require('request');
const stream = require('stream');

function uploadToS3(s3, cb) {
  var pass = new stream.PassThrough();

  var params = {Body: pass};
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
  req.on('response', function(resp) {
    if (resp.statusCode == 200) {
      req.pipe(uploadToS3(s3, callback));
      req.resume();
    } else {
      callback(new Error('request item did not respond with HTTP 200'));
    }
  });
}

const RSVP = require('rsvp');
const knox = require('knox');
const zlib = require('zlib');

const HTTP_OK = 200;

function compressData(data) {
  console.log('--> Compressing data...');

  return new RSVP.Promise(function(resolve, reject) {
    let buffer = Buffer.from(data, 'utf-8');

    zlib.gzip(buffer, function(err, result) {
      if (err) {
        return reject(err);
      }

      console.log('--> Compression done.');
      resolve(result);
    });
  });
}

function createPutString(config) {
  return function(data) {
    return new RSVP.Promise(function(resolve, reject) {
      console.log('--> Uploading:', config.fileName);

      let requestOptions = {
        'Content-Length': data.length,
        'Content-Type': config.contentType,
        'Content-Encoding': config.contentEncoding,
        'x-amz-acl': 'public-read'
      };

      let client = knox.createClient(config.clientSettings);
      let req = client.put(config.fileName, requestOptions);

      req.on('response', function(res) {
        if (res.statusCode === HTTP_OK) {
          console.log('--> Data uploaded to:', req.url);
          resolve(res);
        } else {
          reject(res);
        }
      });

      req.end(data);
    });
  };
}

module.exports = function(clientSettings) {
  function uploadData(options) {
    let config = Object.assign({}, options, {
      clientSettings: clientSettings
    });

    if (options.compressData) {
      config.contentEncoding = 'gzip';
      let putString = createPutString(config);
      return compressData(options.data)
        .then(putString)
        .then(function() {
          return options.data;
        });
    } else {
      config.contentEncoding = 'utf8';
      let putString = createPutString(config);
      return putString(options.data).then(() => {
        return options.data;
      });
    }
  }

  return function(options) {
    return function() {
      return uploadData(options);
    };
  };
};

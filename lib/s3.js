const RSVP = require('rsvp');
const knox = require('knox');
const zlib = require('zlib');

const HTTP_OK = 200;


function compressData(data) {
  console.log('--> Compressing data...');

  return new RSVP.Promise(function(resolve, reject) {
    const buffer = new Buffer(data, 'utf-8');

    zlib.gzip(buffer, function(err, result) {
      if (err) { return reject(err); }

      console.log('--> Compression done.');
      resolve(result);
    });
  });
}

function createPutString(config) {
  return function(data) {
    return new RSVP.Promise(function(resolve, reject) {
      console.log('--> Uploading:', config.fileName);

      const requestOptions = {
        'Content-Length': data.length,
        'Content-Type': config.contentType,
        'Content-Encoding': config.contentEncoding,
        'x-amz-acl': 'public-read'
      };

      const client = knox.createClient(config.clientSettings);
      const req = client.put(config.fileName, requestOptions);

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
    const config = Object.assign({}, options, {
      contentEncoding: 'gzip',
      clientSettings: clientSettings
    });

    const putString = createPutString(config);

    return compressData(options.data)
      .then(putString)
      .then(function() {
        return options.data;
      });
  }

  return function(options) {
    return function() {
      return uploadData(options);
    };
  };
};

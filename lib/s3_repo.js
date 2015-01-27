var RSVP = require('rsvp'),
    knox = require('knox'),
    zlib = require('zlib');


var S3Repo = function(options) {
  this.options = options;
  this.client = knox.createClient(this.options);
  this.addonFilename = options.addonFilename;
  this.feedFilename = options.feedFilename;
};

S3Repo.prototype._compressData = function(data) {
  console.log('--> Compressing data...');
  var promise = new RSVP.Promise(function(resolve, reject) {
    var buf = new Buffer(data, 'utf-8');
    zlib.gzip(buf, function(err, result) {
      if (err) reject(new Error(err));
      console.log('--> Compression done.');
      resolve(result);
    });
  });
  return promise;
};

S3Repo.prototype.saveAddonData = function(addonData) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    var data = JSON.stringify(addonData.map(function(item) {
      return  {
        name: item.name,
        description: item.description,
        time: item.time,
        author: item.author,
        github: item.github,
        _npmUser: item._npmUser,
        downloads: item.downloads
      };
    }));

    self._compressData(data).then(function(gzipData) {
      console.log('--> Uploading:', self.addonFilename);
      var req = self.client.put(self.addonFilename, {
        'Content-Length': gzipData.length,
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'x-amz-acl': 'public-read'
      });
      req.on('response', function(res){
        if (200 === res.statusCode) {
          console.log('--> Data uploaded to %s', req.url);
          resolve(addonData);
        } else {
          reject(new Error(res.statusCode));
        }
      });
      req.end(gzipData);
    });

  });
  return promise;
};

S3Repo.prototype.saveAddonFeed = function(feedString) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self._compressData(feedString).then(function(gzipData) {
      console.log('--> Uploading:', self.feedFilename);
      var req = self.client.put(self.feedFilename, {
        'Content-Length': gzipData.length,
        'Content-Type': 'application/xml+rss',
        'Content-Encoding': 'gzip',
        'x-amz-acl': 'public-read'
      });
      req.on('response', function(res){
        if (200 === res.statusCode) {
          console.log('--> Data uploaded to %s', req.url);
          resolve(feedString);
        } else {
          reject(new Error(res.statusCode));
        }
      });
      req.end(gzipData);
    });
  });
  return promise;

};


module.exports = S3Repo;

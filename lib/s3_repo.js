var RSVP = require('rsvp'),
    knox = require('knox'),
    zlib = require('zlib');


var S3Repo = function(options) {
  this.options = options;
  this.client = knox.createClient(this.options);
};

S3Repo.prototype.saveAddonData = function(addonData) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    var data = JSON.stringify(addonData.map(function(item) {
      return {
        name: item.name,
        description: item.description,
        time: item.time,
        homepage: item.homepage,
        keywords: item.keywords,
        repository: item.repository,
        author: item.author,
        bugs: item.bugs,
        license: item.license,
        readmeFilename: item.readmeFilename,
        github: item.github,
        _npmUser: item._npmUser,
        starred: item.starred,
        downloads: item.downloads,
        emberAddon: item.latest.emberAddon || {}
      };
    }));

    self._compressData(data).then(function(gzipData) {
      var req = self.client.put('addons.json', {
        'Content-Length': gzipData.length,
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'x-amz-acl': 'public-read'
      });
      req.on('response', function(res){
        if (200 === res.statusCode) {
          console.log('--> Data uploaded to %s', req.url);
          resolve(req);
        } else {
          reject();
        }
      });
      req.end(gzipData);
    });

  });
  return promise;
};

S3Repo.prototype._compressData = function(data) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    var buf = new Buffer(data, 'utf-8');
    zlib.gzip(buf, function(err, result) {
      if (err) reject(new Error(err));
      resolve(result);
    });
  });
  return promise;
};


module.exports = S3Repo;

var RSVP = require('rsvp'),
    knox = require('knox'),
    zlib = require('zlib');


var S3Repo = function(options) {
  this.options = options;
  this.client = knox.createClient(this.options);
  this.pagesFilename = options.pagesFilename;
  this.addonFilename = options.addonFilename;
  this.feedFilename = options.feedFilename;
  this.maxItemsPerPage = options.maxItemsPerPage;
};


/**
 * Takes and array and returns an array
 * of arrays of the desired length
 *
 * @param {Array} array The array you want to split
 * @param {number} slices Number of slices
 * @return {[type]}
 */
S3Repo.prototype._split = function(array, slices) {
  var len = array.length,out = [], i = 0;
  while (i < len) {
      var size = Math.ceil((len - i) / slices--);
      out.push(array.slice(i, i += size));
  }
  return out;
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

/**
 * Compress and upload a string as a file
 * to the current bucket
 *
 * @param {object} options
 * @param {string} options.data file contents
 * @param {string} options.contentType desired file Content-Type
 * @return {[type]}
 */
S3Repo.prototype._putString = function(options) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self._compressData(options.data).then(function(gzipData) {
      console.log('--> Uploading:', options.filename);
      var requestOptions = {
        'Content-Length': gzipData.length,
        'Content-Type': options.contentType,
        'Content-Encoding': 'gzip',
        'x-amz-acl': 'public-read'
      };
      var req = self.client.put(options.filename, requestOptions);
      req.on('response', function(res) {
        if (res.statusCode === 200) {
          console.log('--> Data uploaded to %s', req.url);
          resolve(res);
        } else {
          reject(res);
        }
      });
      req.end(gzipData);
    });
  });
  return promise;
};

S3Repo.prototype._prepareAddonData = function(addonData) {
  return JSON.stringify(addonData.map(function(item) {
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
};

S3Repo.prototype.saveAddonData = function(addonData) {
  var data = this._prepareAddonData(addonData);
  return this._putString({
    data: data,
    filename: this.addonFilename,
    contentType: 'application/json'
  });
};

S3Repo.prototype.saveAddonPages = function(addonData) {
  var self = this,
      slices = Math.ceil(addonData.length / this.maxItemsPerPage),
      pages = this._split(addonData, slices),
      pageFilenames = [];

  var promises = pages.map(function(page, index) {
    var filenameParts = self.addonFilename.split('.'),
        filename = 'pages/' + filenameParts[0] + '-' + (index + 1) + '.json',
        data = self._prepareAddonData(page);

    pageFilenames.push(filename);

    return self._putString({
      data: data,
      filename: filename,
      contentType: 'application/json'
    });
  });

  return RSVP.all(promises).then(function() {
    return self._putString({
      data: JSON.stringify({pages: pageFilenames}),
      filename: self.pagesFilename,
      contentType: 'application/json'
    });
  });
};

S3Repo.prototype.saveAddonFeed = function(feedString) {
  return this._putString(feedString, this.feedFilename, 'application/json');
};


module.exports = S3Repo;

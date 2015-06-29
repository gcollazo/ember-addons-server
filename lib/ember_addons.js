var RSVP = require('rsvp'),
    request = RSVP.denodeify(require('request')),
    _ = require('lodash'),

    Registry = require('npm-registry'),
    npm = new Registry({
      registry: 'http://registry.npmjs.org/'
    }),

    EMBER_OBSERVER_API_URL = 'http://emberobserver.com/api/addons',
    EMBER_ADDON_KEYWORD = 'ember-addon',
    IGNORE_ADDON_PATTERNS = [/ember-cli-fill-murray-.*/],

    RETRY_ATTEMPTS = 10;


var EmberAddons = function(options) {
  this.options = options || {};
  this.debug = this.options.debug || false;
};

EmberAddons.prototype.log = function() {
  if (this.debug) {
    console.log.apply(this, arguments);
  }
};

EmberAddons.prototype.get = function(name) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.log('--> Getting details:', name);

    function makeRequest(name, attempts, callback) {
      if (attempts > RETRY_ATTEMPTS) callback(new Error('Too many attempts:' + name));
      npm.packages.get(name, function(err, data) {
        if (err) {
          self.log('--> Retry get ['+ attempts +'/'+ RETRY_ATTEMPTS +']:', name);
          makeRequest(name, attempts + 1, callback);
        } else {
          callback(null, data);
        }
      });
    }

    makeRequest(name, 1, function(err, data) {
      if (err) reject(err);
      self.log('--> Got details for:', data[0].name);
      resolve(data[0]);
    });
  });

  return promise;
};

EmberAddons.prototype.downloads = function(item) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.log('--> Getting downloads for:', item.name);

    function makeRequest(name, attempts, callback) {
      if (attempts > RETRY_ATTEMPTS) callback(new Error('Too many attempts:', name));
      npm.downloads.totals('last-month', name, function(err, data) {
        if (err) {
          self.log('--> Retry downloads ['+ attempts +'/'+ RETRY_ATTEMPTS +']:', name);
          makeRequest(name, attempts + 1, callback);
        } else {
          callback(null, data);
        }
      });
    }

    makeRequest(item.name, 1, function(err, data) {
      if (err) reject(err);
      self.log('--> Got downloads for:', item.name);
      item.downloads = data[0];
      resolve(item);
    });

  });
  return promise;
};


EmberAddons.prototype.fetchAll = function fetchAll() {
  var self = this;

  function isNotIgnored(addon) {
    // Returns true if addon.name does not match
    // any of the IGNORE_ADDON_PATTERNS
    return IGNORE_ADDON_PATTERNS.every(function(pattern) {
      if (addon.name.search(pattern) < 0) {
        return true;
      } else {
        self.log('--> Skip:', addon.name);
        return false;
      }
    });
  }

  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, data) {
      if (err) reject(err);

      self.log('--> All addons:', data.length);

      var filtered = data.filter(isNotIgnored);
      self.log('--> Filtered addons:', filtered.length);

      resolve(filtered);
    });

  });
  return promise;
};

EmberAddons.prototype.fetchAllWithDetails = function() {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.fetchAll()
      .then(function(addons) {

        var promises = addons.map(function(item) {
          if (item.name) {
            return self.get(item.name);
          }
        });
        resolve(RSVP.all(promises));
      })
      .catch(function(err) {
        reject(err);
      });
  });
  return promise;
};

EmberAddons.prototype.fetchAllWithDetailsAndDownloads = function() {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.fetchAllWithDetails()
      .then(function(addons) {

        var promises = addons.map(function(item) {
          return self.downloads(item);
        });
        resolve(RSVP.all(promises));
      })
      .catch(function(err) {
        reject(err);
      });
  });
  return promise;
};

/**
 * Fetch data and sort from newest to oldest updated.
 * @return {Array} Returns an array of Object
 */
EmberAddons.prototype.fetchAllWithDetailsAndDownloadsSorted = function() {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.fetchAllWithDetailsAndDownloads().then(function(result) {
      self.log('--> Sorting...');
      result.sort(function(a, b) {
        // from newest to oldest
        return b.time.modified - a.time.modified;
      });
      resolve(result);
    })
    .catch(reject);
  });
  return promise;
};

EmberAddons.prototype.fetch = function() {
  var self = this;
  var promise = new RSVP.Promise(function(resolve) {
    self.fetchAllWithDetailsAndDownloadsSorted().then(function(addons) {
      self.log('--> Getting scores...');

      request(EMBER_OBSERVER_API_URL).then(function(response) {
        var observerData = JSON.parse(response.body).addons;

        addons.forEach(function(addon) {
          var eoData = _.findWhere(observerData, {name: addon.name});

          if (eoData) {
            addon.emberObserver = {
              score: eoData.score,
              isWIP: eoData.is_wip,
              note: eoData.note
            };
          }
        });

        resolve(addons);
      });

    });
  });
  return promise;
};

module.exports = EmberAddons;

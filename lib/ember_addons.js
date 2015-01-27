var RSVP = require('rsvp'),

    registry = require('npm-registry'),
    npm = new registry(),

    EMBER_ADDON_KEYWORD = 'ember-addon',
    IGNORE_ADDON_PATTERNS = [/ember-cli-fill-murray-.*/],

    RETRY_ATTEMPTS = 10;


var EmberAddons = function() {};

EmberAddons.prototype.get = function(name) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    console.log('--> Getting details:', name);

    function makeRequest(name, attempts, callback) {
      if (attempts > RETRY_ATTEMPTS) callback(new Error('Too many attempts:' + name));
      npm.packages.get(name, function(err, data) {
        if (err) {
          console.log('--> Retry get ['+attempts+']:', name);
          makeRequest(name, attempts + 1, callback);
        } else {
          callback(null, data);
        }
      });
    }

    makeRequest(name, 1, function(err, data) {
      if (err) reject(err);
      console.log('--> Got details for:', data[0].name);
      resolve(data[0]);
    });
  });

  return promise;
};

EmberAddons.prototype.downloads = function(item) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    console.log('--> Getting downloads for:', item.name);

    function makeRequest(name, attempts, callback) {
      if (attempts > RETRY_ATTEMPTS) callback(new Error('Too many attempts:', name));
      npm.downloads.totals('last-month', name, function(err, data) {
        if (err) {
          console.log('--> Retry downloads ['+attempts+']:', name);
          makeRequest(name, attempts + 1, callback);
        } else {
          callback(null, data);
        }
      });
    }

    makeRequest(item.name, 1, function(err, data) {
      if (err) reject(err);
      console.log('--> Got downloads for:', item.name);
      item.downloads = data[0];
      resolve(item);
    });

  });
  return promise;
};

function isNotIgnored(addon) {
  // Returns true if addon.name does not match
  // any of the IGNORE_ADDON_PATTERNS
  return IGNORE_ADDON_PATTERNS.every(function(pattern) {
    if (addon.name.search(pattern) < 0) {
      return true;
    } else {
      console.log('--> Skip:', addon.name);
      return false;
    }
  });
}

EmberAddons.prototype.fetchAll = function fetchAll() {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, data) {
      if (err) reject(err);

      console.log('--> All addons:', data.length);

      var filtered = data.filter(isNotIgnored);
      console.log('--> Filtered addons:', filtered.length);

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

module.exports = EmberAddons;

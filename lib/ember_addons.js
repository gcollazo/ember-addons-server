var Registry = require('npm-registry'),
    npm = new Registry(),
    RSVP = require('rsvp'),
    EMBER_ADDON_KEYWORD = 'ember-addon',
    IGNORE_ADDON_PATTERNS = [/ember-cli-fill-murray-.*/],
    TIMEOUT = 0,
    TIMEOUT_FACTOR = 160;


var EmberAddons = function() {};

EmberAddons.prototype.get = function(name) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    console.log('--> Getting details:', name);

    function doIt() {
      npm.packages.get(name, function(err, data) {
        if (err) {
          console.error('--X Error getting:', name);
          reject(new Error(err));
        }
        if (typeof data === 'undefined') {
          reject(new Error('Data is undefined on EmberAddons.prototype.get'));
        } else {
          resolve(data[0]);
          console.log('--> Got details:', name);
        }
      });
    }

    // Slow down requests to bypass registry rate limits.
    setTimeout(doIt, TIMEOUT);
    TIMEOUT += TIMEOUT_FACTOR;
  });
  return promise;
};

EmberAddons.prototype.downloads = function(name, object) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.downloads.totals('last-month', name, function(err, data) {
      if (err) reject(new Error(err));

      if (object && typeof data !== 'undefined') {
        object.downloads = data[0];
        resolve(object);
      } else if (typeof data !== 'undefined') {
        resolve(data[0]);
      } else {
        resolve(null);
      }
    });
  });
  return promise;
};

function isNotIgnored(addon) {
  // Returns true if addon.name does not match
  // any of the IGNORE_ADDON_PATTERNS
  return IGNORE_ADDON_PATTERNS.every(function(pattern) {
    return addon.name.search(pattern) < 0;
  });
}

EmberAddons.prototype.fetchAll = function fetchAll() {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, data) {
      if (err) reject(new Error(err));

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

        var pArr = addons.map(function(item) {
          if (item.name) {
            return self.get(item.name);
          }
        });

        resolve(RSVP.all(pArr));
      })
      .catch(function(err) {
        reject(new Error(err));
      });
  });
  return promise;
};

EmberAddons.prototype.fetchAllWithDetailsAndDownloads = function() {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.fetchAllWithDetails()
      .then(function(addons) {
        var pArr = addons.map(function(item) {
          return self.downloads(item.name, item);
        });
        resolve(RSVP.all(pArr));
      })
      .catch(function(err) {
        reject(err);
      });
  });
  return promise;
};

//
// Testing
//
// var emaddons = new EmberAddons();
// emaddons.get('ember-cli-showdown').then(function(result) {
//   console.log(result.latest.emberAddon);
// });

module.exports = EmberAddons;

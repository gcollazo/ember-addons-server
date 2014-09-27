var Registry = require('npm-registry'),
    npm = new Registry({}),
    RSVP = require('rsvp'),
    EMBER_ADDON_KEYWORD = 'ember-addon';


var EmberAddons = function() {};

EmberAddons.prototype.get = function(name) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.packages.get(name, function(err, data) {
      if (err) reject(new Error(err));
      resolve(data[0]);
    });
  });
  return promise;
};

EmberAddons.prototype.downloads = function(name, object) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.downloads.totals('last-month', name, function(err, data) {
      if (err) reject(new Error(err));

      if (object) {
        object.downloads = data[0];
        resolve(object);
      } else {
        resolve(data[0]);
      }
    });
  });
  return promise;
};

EmberAddons.prototype.fetchAll = function fetchAll() {
  var promise = new RSVP.Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, data) {
      if (err) reject(new Error(err));
      resolve(data);
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
          return self.get(item.name);
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

// emaddons.fetchAllWithDetailsAndDownloads().then(function(data) {
//   console.log(JSON.stringify(data, undefined, 2));
// });

module.exports = EmberAddons;

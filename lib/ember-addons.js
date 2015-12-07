var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var _ = require('lodash');

var Registry = require('npm-registry');
var npm = new Registry({ registry: 'http://registry.npmjs.org/' });

var EMBER_OBSERVER_API_URL = 'http://emberobserver.com/api/addons';
var EMBER_ADDON_KEYWORD = 'ember-addon';
var IGNORE_ADDON_PATTERNS = [
  /fill-murray-?/,
  /fill-murry/
];

var MAX_RETRY_ATTEMPTS = 10;

function ignoredAddons(addon) {
  // Returns true if addon.name does not match
  // any of the IGNORE_ADDON_PATTERNS
  var result = IGNORE_ADDON_PATTERNS.every(function(pattern) {
    return !pattern.test(addon.name);
  });

  if (!result) {
    console.log('--> Skipping:', addon.name);
  }

  return result;
}

function createRequester(maxRetries) {
  return function makeRequest(name, attempts, cb) {
    if (attempts > maxRetries) { return cb(new Error('Too many attempts:' + name)); }

    npm.packages.get(name, function(err, data) {
      if (err) {
        console.log('--> Retry get [' + attempts + '/' + maxRetries + ']:', name);
        makeRequest(name, attempts + 1, cb);
      } else {
        return cb(null, data);
      }
    });
  };
}

function getAllAddons() {
  return new RSVP.Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, results) {
      if (err) { return reject(err); }

      var filtered = results.filter(ignoredAddons);
      console.log('--> Found addon count:', results.length);
      console.log('--> Filtered addon count:', filtered.length);
      resolve(filtered);
    });
  });
}

function getAddonDetails(name) {
  return new RSVP.Promise(function(resolve, reject) {
    var requester = createRequester(MAX_RETRY_ATTEMPTS);

    console.log('--> Getting details:', name);

    requester(name, 1, function(err, result) {
      if (err) { return reject(err); }

      console.log('--> Got details for:', name);
      resolve(result[0]);
    });
  });
}

function getDetailsForAddons(addons) {
  var promises = addons.map(function(addon) {
    if (addon.name) {
      return getAddonDetails(addon.name);
    }
  });

  return RSVP.all(promises);
}

function getAddonDownloadsAndAppend(addon) {
  return new RSVP.Promise(function(resolve, reject) {
    var requester = createRequester(MAX_RETRY_ATTEMPTS);

    console.log('--> Getting downloads for:', addon.name);

    requester(addon.name, 1, function(err, result) {
      if (err) { return reject(err); }

      console.log('--> Got downloads for:', addon.name);
      addon.downloads = result[0];
      resolve(addon);
    });
  });
}

function getDownloadsForAddons(addons) {
  var promises = addons.map(function(addon) {
    return getAddonDownloadsAndAppend(addon);
  });

  return RSVP.all(promises);
}

function sortAddons(addons) {
  console.log('--> Sorting...');

  addons.sort(function(a, b) {
    return b.time.modified - a.time.modified;
  });

  return RSVP.Promise.resolve(addons);
}

function getAddonScoreAndAppend(addons) {
  console.log('--> Getting scores...');

  return request(EMBER_OBSERVER_API_URL)
    .then(function(response) {
      var observerData = JSON.parse(response.body).addons;

      addons.forEach(function(addon) {
        var score = _.findWhere(observerData, { name: addon.name });

        if (score) {
          addon.emberObserver = {
            score: score.score,
            isWIP: score.is_wip
          };
        }
      });

      return addons;
    });
}

function fetch() {
  return getAllAddons()
    .then(getDetailsForAddons)
    .then(getDownloadsForAddons)
    .then(getAddonScoreAndAppend)
    .then(sortAddons);
}

module.exports = fetch;

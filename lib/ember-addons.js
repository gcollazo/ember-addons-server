const promisify = require('promisify-node');
const request = promisify('request');

const _ = require('lodash');
const { cleanAddons, hasName } = require('./cleanAddons');

const Registry = require('npm-registry');
const npm = new Registry({ registry: 'http://registry.npmjs.org/' });

const EMBER_OBSERVER_API_URL = 'http://emberobserver.com/api/addons';
const EMBER_ADDON_KEYWORD = 'ember-addon';
const IGNORE_ADDON_PATTERNS = [
  /fill-murray-?/,
  /fill-murry/,
  /test-addonasdasdcxvsdfsfsbsdfscxvcvxdvsdfsdfsdfxcvxcvs12431123mvhxcvxcvx/
];

const MAX_RETRY_ATTEMPTS = 10;

function ignoredAddons(addon) {
  // Returns true if addon.name does not match
  // any of the IGNORE_ADDON_PATTERNS
  const result = IGNORE_ADDON_PATTERNS.every(function(pattern) {
    return !pattern.test(addon.name);
  });

  if (!result) {
    console.log('--> Skipping:', addon.name);
  }

  return result;
}

function createRequester(options) {
  return function makeRequest(name, attempts, cb) {
    if (typeof attempts === 'function') {
      cb = attempts;
      attempts = 1;
    }

    if (attempts > options.maxRetries) {
      return cb(new Error('Too many attempts:' + name));
    }

    function onResponse(err, data) {
      if (err) {
        const max = options.maxRetries;
        console.log(`--> Retry get [${attempts}/${max}]: ${name}`);
        makeRequest(name, attempts + 1, cb);
      } else {
        return cb(null, data);
      }
    }

    switch (options.method) {
      case 'DETAILS':
        npm.packages.get(name, onResponse);
        break;

      case 'DOWNLOADS':
        npm.downloads.totals('last-month', name, onResponse);
        break;
    }
  };
}

function getAll() {
  return new Promise(function(resolve, reject) {
    npm.packages.keyword(EMBER_ADDON_KEYWORD, function(err, results) {
      if (err) {
        return reject(err);
      }

      const filtered = results.filter(ignoredAddons);
      console.log('--> Found addon count:', results.length);
      console.log('--> Filtered addon count:', filtered.length);
      resolve(filtered);
    });
  });
}

function getAddonDetails(name) {
  return new Promise(function(resolve, reject) {
    const requester = createRequester({
      method: 'DETAILS',
      maxRetries: MAX_RETRY_ATTEMPTS
    });

    console.log('--> Getting details:', name);

    requester(name, function(err, result) {
      if (err) {
        return reject(err);
      }

      console.log('--> Got details for:', name);
      resolve(result[0]);
    });
  });
}

function getDetailsForAddons(addons) {
  const promises = addons
    .filter(hasName)
    .map(function(addon) {
      return getAddonDetails(addon.name);
    });

  return Promise.all(promises);
}

function getAddonDownloadsAndAppend(addon) {
  return new Promise(function(resolve, reject) {

    const requester = createRequester({
      method: 'DOWNLOADS',
      maxRetries: MAX_RETRY_ATTEMPTS
    });

    console.log('--> Getting downloads for:', addon.name);

    requester(addon.name, function(err, result) {
      if (err) {
        return reject(err);
      }

      console.log('--> Got downloads for:', addon.name);
      addon.downloads = result[0];
      resolve(addon);
    });
  });
}

function getDownloadsForAddons(addons) {
  const promises = addons.map(function(addon) {
    return getAddonDownloadsAndAppend(addon);
  });

  return Promise.all(promises);
}

function sortAddons(addons) {
  console.log('--> Sorting...');

  addons.sort(function(a, b) {
    return b.time.modified - a.time.modified;
  });

  return Promise.resolve(addons);
}

function getScoreForAddons(addons) {
  console.log('--> Getting scores...');

  return request(EMBER_OBSERVER_API_URL)
    .then(function(response) {
      const observerData = JSON.parse(response.body).addons;

      addons.forEach(function(addon) {
        const score = _.findWhere(observerData, { name: addon.name });

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

function getDetails(allAddons) {
  return getDetailsForAddons(allAddons)
    .then(getDownloadsForAddons)
    .then(getScoreForAddons)
    .then(sortAddons)
    .then(cleanAddons);
}

module.exports = {
  getDetails: getDetails,
  getAll: getAll
};

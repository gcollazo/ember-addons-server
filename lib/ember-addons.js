const Promise = require('bluebird');
const promisify = require('promisify-node');
const request = promisify('request');

const find = require('lodash/find');
const { cleanAddons, hasName } = require('./cleanAddons');

const Registry = require('npm-registry');
const npm = new Registry({ registry: 'http://registry.npmjs.org/' });

const EMBER_OBSERVER_API_URL = 'https://www.emberobserver.com/api/v2/autocomplete_data';
const EMBER_ADDON_KEYWORD = 'ember-addon';
const IGNORE_ADDON_PATTERNS = [
  /fill-murray-?/,
  /fill-murry/,
  /test-addonasdasdcxvsdfsfsbsdfscxvcvxdvsdfsdfsdfxcvxcvs12431123mvhxcvxcvx/
];

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

function _getDetails(name) {
  return new Promise((resolve, reject) => {
    npm.packages.get(name, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

function getDetailsForAddons(addons) {
  const fitered = addons.filter(hasName);
  return Promise.map(fitered, (addon) => {
    console.log('--> Fetching addon info:', addon.name);
    return _getDetails(addon.name).then((r) => r[0]);
  }, { concurrency: 10 });
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
        const score = find(observerData, { name: addon.name });

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

async function getDetails(allAddons) {
  return getDetailsForAddons(allAddons)
    .then(getScoreForAddons)
    .then(cleanAddons)
    .then(sortAddons);
}

module.exports = {
  getDetails: getDetails,
  getAll: getAll
};

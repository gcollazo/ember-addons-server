const Promise = require('bluebird');
const promisify = require('promisify-node');
const request = promisify('request');

const find = require('lodash/find');
const { cleanAddons, hasName } = require('./cleanAddons');

const Registry = require('npm-registry');
const npm = new Registry({ registry: 'https://registry.npmjs.org/' });

const EMBER_OBSERVER_API_URL =
  'https://www.emberobserver.com/api/v2/autocomplete_data';
const IGNORE_ADDON_PATTERNS = [
  /fill-murray-?/,
  /fill-murry/,
  /test-addonasdasdcxvsdfsfsbsdfscxvcvxdvsdfsdfsdfxcvxcvs12431123mvhxcvxcvx/
];
const NPM_COUCH_DB_URL =
  'https://skimdb.npmjs.com/registry/_design/app/_view/byKeyword?startkey=["ember-addon"]&endkey=["ember-addon",{}]&group_level=3';

async function getAll() {
  let response = await request({ url: NPM_COUCH_DB_URL, json: true });
  let addons = response.body.rows.reduce((filteredAddons, row) => {
    let name = row.key[1];
    let ignoreAddon = IGNORE_ADDON_PATTERNS.every(
      (pattern) => !pattern.test(name)
    );

    if (hasName({ name }) && ignoreAddon) {
      filteredAddons.push({ name: name });
    }

    return filteredAddons;
  }, []);
  return addons;
}

function _getDetails(name) {
  return new Promise((resolve) => {
    npm.packages.get(name, (error, result) => {
      if (error) {
        // pass
        resolve([null]);
      } else {
        resolve(result);
      }
    });
  });
}

async function getDetailsForAddons(addons) {
  let filtered = addons.filter(hasName);
  let result = [];
  for (let addon of filtered) {
    try {
      console.log('--> Fetching addon info:', addon.name);
      let details = await _getDetails(addon.name);
      result.push(details[0]);
    } catch (e) {
      // pass
      console.log('--> Error getting:', addon.name);
    }
  }
  return result;
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

  return request(EMBER_OBSERVER_API_URL).then(function(response) {
    let observerData = JSON.parse(response.body).addons;

    addons.forEach(function(addon) {
      let score = find(observerData, { name: addon.name });

      if (score) {
        if (score.is_wip) {
          // WIP
          addon.emberObserver = { score: -1 };
        } else if (!score.score) {
          // No review
          addon.emberObserver = { score: -2 };
        } else {
          // Score!
          addon.emberObserver = { score: parseFloat(score.score) };
        }
      } else {
        // No review
        addon.emberObserver = { score: -2 };
      }
    });

    return addons;
  });
}

function getDetails(allAddons) {
  return getDetailsForAddons(allAddons)
    .then(getScoreForAddons)
    .then(cleanAddons)
    .then(sortAddons);
}

module.exports = {
  getDetails: getDetails,
  getAll: getAll
};

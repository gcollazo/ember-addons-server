const Promise = require('bluebird');
const promisify = require('promisify-node');
const request = promisify('request');

const find = require('lodash/find');
const { cleanAddons, hasName } = require('./cleanAddons');

const Registry = require('npm-registry');
const npm = new Registry({ registry: 'https://registry.npmjs.org/' });

const EMBER_OBSERVER_API_URL = 'https://www.emberobserver.com/api/v2/autocomplete_data';
const EMBER_ADDON_KEYWORD = 'ember-addon';
const IGNORE_ADDON_PATTERNS = [
  /fill-murray-?/,
  /fill-murry/,
  /test-addonasdasdcxvsdfsfsbsdfscxvcvxdvsdfsdfsdfxcvxcvs12431123mvhxcvxcvx/
];
const NPM_COUCH_DB_URL = `https://skimdb.npmjs.com/registry/_design/app/_view/byKeyword
  ?startkey=["ember-addon"]
  &endkey=["ember-addon",{}]
  &group_level=3`;

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
    // Hit the couchDB of NPM. The common registry endpoint is limited to 250 entries per search.
    // Its the only place to get all addon names with the keyWord 'ember-addon'.
    return request({ url: NPM_COUCH_DB_URL json: true }, (err, response, body)=> {
      if (err) {
        return reject(err);
      }
      // We only need the names of the addons and receive the details later.
      // The NPM couchDB doesn't give much more details anyways
      const addons = body.rows.reduce((filteredAddons, row)=> {
        const name        = row.key[1];
        const ignoreAddon = IGNORE_ADDON_PATTERNS.every((pattern)=> !pattern.test(name));

        if (hasName({ name }) && ignoreAddon) {
          filteredAddons.push({name: name})
        };

        return filteredAddons;
      }, []);

      resolve(addons);
      }
    );
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
  const filtered = addons.filter(hasName);
  return Promise.map(filtered, (addon) => {
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
          if (score.is_wip) {
            // WIP
            addon.emberObserver = { score: -1 };
          } else if (!score.score) {
            // No review
            addon.emberObserver = { score: -2 };
          } else {
            // Score!
            addon.emberObserver = { score: score.score };
          }
        } else {
          // No review
          addon.emberObserver = { score: -2 };
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

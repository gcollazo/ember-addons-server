require('dotenv').load();

var DB = require('./lib/db');
var S3 = require('./lib/s3_repo');
var fetchAddons = require('./lib/ember-addons');
var RssFeed = require('./lib/rss');

// Init
var db = new DB({
  databaseURL: process.env.DATABASE_URL,
  debug: true
});
var s3repo = new S3({
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_BUCKET_NAME,
  pagesFilename: process.env.PAGES_FILENAME,
  addonFilename: process.env.ADDON_JSON_FILENAME,
  feedFilename: process.env.FEED_FILENAME,
  maxItemsPerPage: parseInt(process.env.MAX_ITEMS_PER_PAGE, 10)
});
var feed = new RssFeed({
  language: 'en',
  pubDate: new Date(),
  title: 'Ember Addons',
  description: 'Listing hundreds of modules that extend ember-cli.',
  'feed_url': 'https://io-builtwithember-addons-data.s3.amazonaws.com/feed.xml',
  'site_url': 'http://addons.builtwithember.io/'
});

var startTime = new Date().getTime();

// Update addons
console.log('--> Fetching data from npm registry...');
fetchAddons()
  .then(function(results) {
    console.log('--> Done fetching data.');

    console.log('--> Creating Feed...');
    var feedXML = feed.getXml(results);

    // Save files to S3
    return s3repo.saveAddonPages(results)
      .then(s3repo.saveAddonData(results))
      .then(s3repo.saveAddonFeed(feedXML))
      .then(function() {
        return results;
      });
  })
  .then(function(results) {
    console.log('--> Done updating %s addons.', results.length);
    return db.updateTotalMetric(results.length);
  })
  .then(function() {
    db.close();
    var totalTime = (new Date().getTime() - startTime) / 1000;

    console.log('--> Duration: ' + totalTime + 's');
  })
  .catch(function(err) {
    console.error(err);
    db.close();
  });

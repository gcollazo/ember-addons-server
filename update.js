require('dotenv').load();

var fetchAddons = require('./lib/ember-addons');
var createRssGenerator = require('./lib/rss');
var createS3FileUploader = require('./lib/s3');
var createDatabase = require('./lib/db');

// Init
var db = createDatabase({
  databaseURL: process.env.DATABASE_URL
});

var rssGenerator = createRssGenerator({
  language: 'en',
  pubDate: new Date(),
  title: 'Ember Addons',
  description: 'Listing hundreds of modules that extend ember-cli.',
  feed_url: 'https://io-builtwithember-addons-data.s3.amazonaws.com/feed.xml',
  site_url: 'http://addons.builtwithember.io/'
});

var s3FileUploader = createS3FileUploader({
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_BUCKET_NAME
});

var startTime = new Date().getTime();


// Update addons
console.log('--> Fetching data from npm registry...');

fetchAddons()
  .then(function(addons) {
    console.log('--> Done fetching data.');

    console.log('--> Creating Feed...');
    var rssFeed = rssGenerator(addons);

    var uploadAddons = s3FileUploader({
      data: JSON.stringify(addons),
      fileName: process.env.ADDON_JSON_FILENAME,
      contentType: 'application/json'
    });

    var uploadFeed = s3FileUploader({
      data: rssFeed,
      fileName: process.env.FEED_FILENAME,
      contentType: 'application/rss+xml'
    });

    // Save files to S3
    return uploadAddons()
      .then(uploadFeed)
      .then(function() { return addons; });
  })
  .then(function(addons) {
    console.log('--> Done updating %s addons.', addons.length);
    return db.updateTotalMetric(addons.length);
  })
  .catch(function(err) {
    console.error('--> ERROR:', err);
  })
  .finally(function() {
    db.close();

    var totalTime = (new Date().getTime() - startTime) / 1000;
    console.log('--> Duration: ' + totalTime + 's');
  });

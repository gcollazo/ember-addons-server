/* eslint-disable camelcase */
require('dotenv').load();

const fetchAddons = require('./lib/ember-addons');
const createRssGenerator = require('./lib/rss');
const createS3FileUploader = require('./lib/s3');
const createDatabase = require('./lib/db');

// Init
const db = createDatabase({
  databaseURL: process.env.DATABASE_URL
});

const rssGenerator = createRssGenerator({
  language: 'en',
  pubDate: new Date(),
  title: 'Ember Addons',
  description: 'Listing hundreds of modules that extend ember-cli.',
  feed_url: 'https://io-builtwithember-addons-data.s3.amazonaws.com/feed.xml',
  site_url: 'http://addons.builtwithember.io/'
});

const s3FileUploader = createS3FileUploader({
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_BUCKET_NAME
});

const startTime = new Date().getTime();


// Update addons
console.log('--> Fetching data from npm registry...');

fetchAddons()
  .then(function(addons) {
    console.log('--> Done fetching data.');

    console.log('--> Creating Feed...');
    const rssFeed = rssGenerator(addons);

    const uploadAddons = s3FileUploader({
      data: JSON.stringify(addons),
      fileName: process.env.ADDON_JSON_FILENAME,
      contentType: 'application/json'
    });

    const uploadFeed = s3FileUploader({
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

    const MILLIS_SECOND = 1000;
    const totalTime = (new Date().getTime() - startTime) / MILLIS_SECOND;
    console.log('--> Duration: ' + totalTime + 's');
  });

/* eslint-disable camelcase */
/* eslint-disable no-process-exit */
require('dotenv').config();

const csv = require('to-csv');

const emberAddons = require('./lib/ember-addons');
const createRssGenerator = require('./lib/rss');
const createS3FileUploader = require('./lib/s3');
const createDatabase = require('./lib/db');
const formatStats = require('./lib/format-stats');

function createTimer() {
  let startTime = new Date().getTime();

  return function() {
    let totalTime = (new Date().getTime() - startTime) / 1000;
    console.log('--> Duration: ' + totalTime + 's');
  };
}

const printTotalTime = createTimer();

// Init...
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

// Check if we need an update
async function run() {
  console.log('--> Starting...');

  try {
    console.log('--> Getting all addons from npm...');
    let allAddons = await emberAddons.getAll();

    console.log('--> Fetching data from npm registry...');
    let addons = await emberAddons.getDetails(allAddons);

    console.log('--> Updating total metric...');
    await db.updateTotalMetric(addons.length);

    console.log('--> Creating Feed...');
    let rssFeed = rssGenerator(addons);

    console.log('--> Creating stats.csv...');
    let rows = await db.getMetric('total');
    let stats = formatStats(rows);

    let uploadAddons = s3FileUploader({
      data: JSON.stringify(addons),
      fileName: process.env.ADDON_JSON_FILENAME,
      contentType: 'application/json'
    });
    await uploadAddons();

    let uploadFeed = s3FileUploader({
      data: rssFeed,
      fileName: process.env.FEED_FILENAME,
      contentType: 'application/rss+xml'
    });
    await uploadFeed();

    let uploadStats = s3FileUploader({
      data: csv(stats),
      fileName: process.env.STATS_FILENAME,
      contentType: 'text/csv'
    });
    await uploadStats();

    let lastUpdated = s3FileUploader({
      data: JSON.stringify({ date: new Date() }),
      fileName: process.env.ADDON_LAST_UPDATED_FILENAME,
      contentType: 'application/json'
    });
    await lastUpdated();

    console.log('--> Done updating %s addons.', addons.length);
    db.close();
    printTotalTime();
    process.exit(0);
  } catch (error) {
    console.error('--> ERROR:', error);
  }
}

run();

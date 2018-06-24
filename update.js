/* eslint-disable camelcase */
require('dotenv').load();

const emberAddons = require('./lib/ember-addons');
const createRssGenerator = require('./lib/rss');
const createS3FileUploader = require('./lib/s3');
const createDatabase = require('./lib/db');

function createTimer() {
  const startTime = new Date().getTime();

  return function() {
    const totalTime = (new Date().getTime() - startTime) / 1000;
    console.log('--> Duration: ' + totalTime + 's');
  };
}

const printTotalTime = createTimer();

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

// Check if we need an update
async function run() {
  try {
    const lastCount = await db.getLatestTotalMetric();
    const allAddons = await emberAddons.getAll();
    if (lastCount === allAddons.length) {
      console.log(
        '--> Needs update: NO --',
        'lastCount:',
        lastCount,
        'newCount:',
        allAddons.length
      );
      printTotalTime();
      process.exit(0);
    } else {
      console.log(
        '--> Needs update: YES --',
        'lastCount:',
        lastCount,
        'newCount:',
        allAddons.length
      );
    }

    console.log('--> Fetching data from npm registry...');
    const addons = await emberAddons.getDetails(allAddons);
    console.log('--> Done fetching data.');

    console.log('--> Creating Feed...');
    const rssFeed = rssGenerator(addons);

    const uploadAddons = s3FileUploader({
      data: JSON.stringify(addons),
      fileName: process.env.ADDON_JSON_FILENAME,
      contentType: 'application/json'
    });
    await uploadAddons();

    const uploadFeed = s3FileUploader({
      data: rssFeed,
      fileName: process.env.FEED_FILENAME,
      contentType: 'application/rss+xml'
    });
    await uploadFeed();

    const lastUpdated = s3FileUploader({
      data: JSON.stringify({ date: new Date() }),
      fileName: process.env.ADDON_LAST_UPDATED_FILENAME,
      contentType: 'application/json'
    });
    await lastUpdated();

    console.log('--> Updating total metric...');
    await db.updateTotalMetric(addons.length);

    console.log('--> Done updating %s addons.', addons.length);
    db.close();
    printTotalTime();
    process.exit(0);
  } catch (error) {
    console.error('--> ERROR:', error);
  }
}

run();

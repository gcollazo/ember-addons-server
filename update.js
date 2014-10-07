var EmberAddons = require('./lib/ember_addons'),
    Repository = require('./lib/db'),
    dotenv = require('dotenv'),
    s3 = require('./lib/s3_repo');

// load vars
dotenv.load();

// Init
var repo = new Repository(process.env.DATABASE_URL);
var emaddons = new EmberAddons();
var s3repo = new s3({
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_BUCKET_NAME,
  addonFilename: process.env.ADDON_JSON_FILENAME
});
var startTime = new Date().getTime();

// Update addons
console.log('--> Fetching data from npm registry...');
emaddons.fetchAllWithDetailsAndDownloads()
  .then(function(results) {
    console.log('--> Done fetching data.');

    console.log('--> Uploading to S3...');
    return s3repo.saveAddonData(results);
  })
  .then(function(results) {
    console.log('--> Done updating %s addons.', results.length);
    console.log('--> Checking last metric saved...');

    return repo.getMetric('total').then(function(totalMetrics) {
      var lastValue = totalMetrics[totalMetrics.length - 1].value;
      if (lastValue !== results.length.toString()) {
        console.log('--> Saving metrics...');
        return repo.saveMetric('total', results.length);
      } else {
        console.log('--> Skiping metrics save...');
      }
    });
  })
  .then(function() {
    repo.db.close();

    var totalTime = (new Date().getTime() - startTime) / 1000;
    console.log('--> Duration: ' + totalTime + 's');
  })
  .catch(function(err) {
    console.error(err);
    repo.db.close();
  });

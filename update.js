var EmberAddons = require('./lib/ember_addons'),
    Repository = require('./lib/db'),
    dotenv = require('dotenv'),
    RSVP = require('rsvp'),
    s3 = require('./lib/s3_repo');

// load vars
dotenv.load();

// Init
var repo = new Repository(process.env.DATABASE_URL);
var emaddons = new EmberAddons();
var s3repo = new s3({
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_BUCKET_NAME
});

// Update addons
console.log('--> Fetching data from npm registry...');
emaddons.fetchAllWithDetailsAndDownloads()
  .then(function(results) {
    console.log('--> Done fetching data.');

    // Save to db
    var promises = results.map(function(item) {
      return repo.createOrReplace({
        name: item.name,
        description: item.description,
        time: item.time,
        homepage: item.homepage,
        keywords: item.keywords,
        repository: item.repository,
        author: item.author,
        bugs: item.bugs,
        license: item.license,
        readmeFilename: item.readmeFilename,
        github: item.github,
        _npmUser: item._npmUser,
        starred: item.starred,
        downloads: item.downloads,
        emberAddon: item.latest.emberAddon || {}
      });
    });

    // Save to S3
    console.log('--> Uploading to S3...');
    promises.push(s3repo.saveAddonData(results));

    console.log('--> Writing to db...');
    return RSVP.all(promises);
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
    console.log('--> Finished.');
    repo.db.close();
  })
  .catch(function(err) {
    console.error(err);
    repo.db.close();
  });

var express = require('express'),
    app = express(),
    cors = require('cors'),
    compression = require('compression'),
    DB = require('./lib/db'),
    dotenv = require('dotenv'),
    csv = require('to-csv'),
    formatStats = require('./lib/format-stats');

// load vars
dotenv.load();


app.use(compression());
app.use(cors());

app.use(function(req, res, next) {
  req.db = new DB({
    databaseURL: process.env.DATABASE_URL,
    debug: true
  });
  next();
});

app.get('/', function(req, res) {
  res.redirect(301,
    'https://io-builtwithember-addons-data.s3.amazonaws.com/addons.json');
});

app.get('/stats', function(req, res) {
  req.db.getMetric('total')
    .then(function(rows) {
      res.json(formatStats(rows));
      req.db.close();
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).json({ error: 'error' });
      req.db.close();
    });
});

app.get('/stats.csv', function(req, res) {
  req.db.getMetric('total')
    .then(function(rows) {
      var stats = formatStats(rows);
      var table = [];

      for (var i = 0; i < Object.keys(stats).length; i++) {
        table.push({
          created: Object.keys(stats)[i],
          value: stats[ Object.keys(stats)[ i ] ]
        });
      }

      res.set('Content-Type', 'text/csv').send(csv(table));
      req.db.close();
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).json({ error: 'error' });
      req.db.close();
    });
});

app.get('/graph', function(req, res) {
  res.redirect(301,
    'http://www.charted.co/?{%22dataUrl%22:%22http://ember-addons-server.herokuapp.com/stats.csv%22,%22charts%22:[{%22type%22:%22line%22,%22title%22:%22Ember%20Addons%22,%22note%22:%22This%20chart%20shows%20the%20number%20of%20available%20addons%20for%20ember-cli%20on%20npmjs.org.%20http://emberaddons.com%22}]}');
});


app.listen(process.env.PORT, function() {
  console.log('listening on port %d', process.env.PORT);
});

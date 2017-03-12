require('dotenv').load();

const express = require('express');
const app = express();
const cors = require('cors');
const compression = require('compression');
const createDatabase = require('./lib/db');
const csv = require('to-csv');
const formatStats = require('./lib/format-stats');

const OK = 200;
const INTERNAL_SERVER_ERROR = 500;
const PERMANENT_REDIRECT = 301;


app.use(compression());
app.use(cors());

app.use(function(req, res, next) {
  req.db = createDatabase({
    databaseURL: process.env.DATABASE_URL
  });
  next();
});

app.get('/', function(req, res) {
  res.redirect(OK,
    'https://io-builtwithember-addons-data.s3.amazonaws.com/addons.json');
});

app.get('/stats', async function(req, res) {
  try {
    const rows = await req.db.getMetric('total');
    const stats = formatStats(rows);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'error' });
  }
  req.db.close();
});

app.get('/stats.csv', async function(req, res) {
  try {
    const rows = await req.db.getMetric('total');
    const stats = formatStats(rows);
    res.set('Content-Type', 'text/csv').send(csv(stats));
  } catch (error) {
    console.error(error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'error' });
  }
  req.db.close();
});

app.get('/graph', function(req, res) {
  res.redirect(PERMANENT_REDIRECT,
    'http://www.charted.co/?{%22dataUrl%22:%22http://ember-addons-server.herokuapp.com/stats.csv%22,%22charts%22:[{%22type%22:%22line%22,%22title%22:%22Ember%20Addons%22,%22note%22:%22This%20chart%20shows%20the%20number%20of%20available%20addons%20for%20ember-cli%20on%20npmjs.org.%20http://emberaddons.com%22}]}');
});


app.listen(process.env.PORT, function() {
  console.log('listening on port %d', process.env.PORT);
});

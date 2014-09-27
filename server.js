var express = require('express'),
    app = express(),
    cors = require('cors'),
    compression = require('compression'),
    Repository = require('./lib/db'),
    dotenv = require('dotenv');

// load vars
dotenv.load();


app.use(compression());
app.use(cors());

app.use(function(req, res, next) {
  req.repo = new Repository(process.env.DATABASE_URL);
  next();
});

app.get('/', function(req, res) {
  req.repo.getAll()
    .then(function(results) {
      res.json(results);
    })
    .catch(function(err) {
      console.error(err);
    });
});

app.get('/stats', function(req, res) {
  req.repo.getMetric('total')
    .then(function(rows) {
      res.json(rows);
    })
    .catch(function(err) {
      console.error(err);
    });
});


app.listen(process.env.PORT, function() {
  console.log('listening on port %d', process.env.PORT);
});

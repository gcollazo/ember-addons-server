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
      var filtered = results.filter(function(mod) {
        // Skip modules with {"emberAddon": {"private": true}} on package.json
        if (!(typeof mod.doc.emberAddon !== 'undefined' &&
            typeof mod.doc.emberAddon.private !== 'undefined' &&
            mod.doc.emberAddon.private === true)) {
          return mod;
        }
      });

      res.json(filtered);
      req.repo.db.close();
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).json({error: 'error'});
      req.repo.db.close();
    });
});

app.get('/stats', function(req, res) {
  req.repo.getMetric('total')
    .then(function(rows) {
      res.json(rows);
      req.repo.db.close();
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).json({error: 'error'});
      req.repo.db.close();
    });
});


app.listen(process.env.PORT, function() {
  console.log('listening on port %d', process.env.PORT);
});

var anydbsql = require('anydb-sql');
var RSVP = require('rsvp');


function defineModels(db) {
  return {
    addon: db.define({
      name: 'addons',
      columns: {
        id: { primaryKey: true },
        name: {},
        doc: {}
      }
    }),

    metric: db.define({
      name: 'metrics',
      columns: {
        id: { primaryKey: true },
        created: {},
        metric: {},
        value: {}
      }
    })
  };
}

function getMetric(options) {
  return function(metric) {
    return new RSVP.Promise(function(resolve, reject) {
      options.model
        .select(options.model.created)
        .select(options.model.value)
        .where({ metric: metric })
        .order(options.model.created.ascending)
        .all(function(err, rows) {
          if (err) { return reject(err); }
          resolve(rows);
        });
    });
  };
}

function saveMetric(options) {
  return new RSVP.Promise(function(resolve, reject) {
    options.db.transaction(function(tx) {
      options.model.insert({ metric: options.metric, value: options.value })
        .execWithin(tx, function(err, rows) {
          if (err) { return reject(err); }
          resolve(rows);
        });
    });
  });
}

function updateTotalMetric(options) {
  return function(newValue) {
    console.log('--> Checking last total metric saved...');

    return getMetric({
      db: options.db,
      model: options.model
    })('total')
    .then(function(totals) {
      var lastValue = totals[totals.length - 1].value;

      if (lastValue !== newValue.toString()) {
        console.log('--> Saving total metric...');
        return saveMetric({
          db: options.db,
          model: options.model,
          metric: 'total',
          value: newValue
        });
      } else {
        console.log('--> Skiping toatal metric save...');
        return RSVP.resolve();
      }
    });
  };
}

function createDatabase(options) {
  var db = anydbsql({ url: options.databaseURL });
  var models = defineModels(db);

  return {
    db: db,
    models: models,
    close: function() {
      db.close();
    },
    updateTotalMetric: updateTotalMetric({
      db: db,
      model: models.metric
    }),
    getMetric: getMetric({
      db: db,
      model: models.metric
    })
  };
}

module.exports = createDatabase;

var anydbsql = require('anydb-sql'),
    RSVP = require('rsvp');


var Database = function(options) {
  this.options = options || {};
  this.debug = this.options.debug || false;
  this.url = this.options.databaseURL;
  this.db = anydbsql({url: this.url});

  this.models = {
    Addon: this.db.define({
      name: 'addons',
      columns: {
        id: {primaryKey: true},
        name: {},
        doc: {}
      }
    }),
    Metric: this.db.define({
      name: 'metrics',
      columns: {
        id: {primaryKey: true},
        created: {},
        metric: {},
        value: {}
      }
    })
  };
};

Database.prototype.log = function() {
  if (this.debug) {
    console.log.apply(this, arguments);
  }
};

Database.prototype.close = function() {
  this.db.close();
};

Database.prototype.getAll = function() {
  var addon = this.models.Addon;

  var promise = new RSVP.Promise(function(resolve, reject) {
    addon.select('*')
      .order(addon.name.ascending)
      .all(function(err, rows) {
        if (err) reject(err);
        resolve(rows);
      });
  });
  return promise;
};

Database.prototype.createOrReplace = function(item) {
  var self = this,
      addon = this.models.Addon;

  var promise = new RSVP.Promise(function(resolve) {
    self.db.transaction(function(tx) {
      addon.delete().where({name: item.name}).execWithin(tx);

      addon.insert({name: item.name, doc: JSON.stringify(item)})
        .execWithin(tx);
    });
    resolve(item.name);
  });
  return promise;
};

Database.prototype.count = function() {
  var addon = this.models.Addon;
  var promise = new RSVP.Promise(function(resolve, reject) {
    addon.select(addon.count()).get(function(err, row) {
      if (err) reject(err);
      resolve(row);
    });

  });
  return promise;
};

Database.prototype.saveMetric = function(name, value) {
  var self = this,
      metric = this.models.Metric;
  var promise = new RSVP.Promise(function(resolve) {
    self.db.transaction(function(tx) {
      metric.insert(metric.metric.value(name), metric.value.value(value))
        .execWithin(tx);
    });
    resolve(name, value);
  });
  return promise;
};

Database.prototype.getMetric = function(name) {
  var metric = this.models.Metric;

  var promise = new RSVP.Promise(function(resolve, reject) {
    metric.select(metric.created).select(metric.value)
      .where({metric: name})
      .order(metric.created.ascending)
      .all(function(err, rows) {
        if (err) reject(err);
        resolve(rows);
      });
  });
  return promise;
};

Database.prototype.updateTotalMetric = function(newValue) {
  var self = this;
  var promise = new RSVP.Promise(function(resolve, reject) {
    self.log('--> Checking last total metric saved...');
    self.getMetric('total').then(function(totals) {
      var lastValue = totals[totals.length - 1].value;
      if (lastValue !== newValue.toString()) {
        self.log('--> Saving total metric...');
        self.saveMetric('total', newValue).then(function() {
          resolve();
        })
        .catch(reject);
      } else {
        self.log('--> Skiping toatal metric save...');
        resolve();
      }
    });
  });
  return promise;
};


module.exports = Database;

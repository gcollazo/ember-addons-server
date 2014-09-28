var anydbsql = require('anydb-sql'),
    RSVP = require('rsvp');


var Repository = function(dbURL) {
  this.url = dbURL;
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

Repository.prototype.getAll = function() {
  var addon = this.models.Addon;

  var promise = new RSVP.Promise(function(resolve, reject) {
    addon.select('*')
      .order(addon.name.ascending)
      .all(function(err, rows) {
        if (err) reject(new Error(err));
        resolve(rows);
      });
  });
  return promise;
};

Repository.prototype.createOrReplace = function(item) {
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

Repository.prototype.count = function() {
  var addon = this.models.Addon;
  var promise = new RSVP.Promise(function(resolve, reject) {
    addon.select(addon.count()).get(function(err, row) {
      if (err) reject(new Error(err));
      resolve(row);
    });

  });
  return promise;
};

Repository.prototype.saveMetric = function(name, value) {
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

Repository.prototype.getMetric = function(name) {
  var metric = this.models.Metric;

  var promise = new RSVP.Promise(function(resolve, reject) {
    metric.select(metric.created).select(metric.value)
      .where({metric: name})
      .order(metric.created.ascending)
      .all(function(err, rows) {
        if (err) reject(new Error(err));
        resolve(rows);
      });
  });
  return promise;
};


module.exports = Repository;

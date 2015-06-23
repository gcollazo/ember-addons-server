require('dotenv').load();

var Hapi = require('hapi');
var server = new Hapi.Server();
var DB = require('./lib/db');
var csv = require('to-csv');
var formatStats = require('./lib/format-stats');

server.connection({port: process.env.PORT});
server.connection({routes: {cors: true}});

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    var url = 'https://io-builtwithember-addons-data.s3.amazonaws.com/addons.json';

    reply.redirect(url);
  }
});

server.route({
  method: 'GET',
  path: '/stats',
  handler: function(request, reply) {
    var db = new DB({ databaseURL: process.env.DATABASE_URL });

    db.getMetric('total')
      .then(function(rows) {
        reply(formatStats(rows));
      })
      .catch(function(err) {
        console.error(err);
        reply(err);
      })
      .finally(function() {
        db.close();
      });
  }
});

server.route({
  method: 'GET',
  path: '/stats.csv',
  handler: function(request, reply) {
    var db = new DB({ databaseURL: process.env.DATABASE_URL });

    db.getMetric('total')
      .then(function(rows) {
        var stats = formatStats(rows);
        var table = [];

        for (var i = 0; i < Object.keys(stats).length; i++) {
          table.push({
            created: Object.keys(stats)[ i ],
            value: stats[ Object.keys(stats)[ i ] ]
          });
        }

        var response = reply(csv(table));

        response.header('Content-Type', 'text/csv');
      })
      .catch(function(err) {
        console.error(err);
        reply(err);
      })
      .finally(function() {
        db.close();
      });
  }
});

server.route({
  method: 'GET',
  path: '/graph',
  handler: function(request, reply) {
    var url = 'http://www.charted.co/?{%22dataUrl%22:%22http://ember-addons-server.herokuapp.com/stats.csv%22,%22charts%22:[{%22type%22:%22line%22,%22title%22:%22Ember%20Addons%22,%22note%22:%22This%20chart%20shows%20the%20number%20of%20available%20addons%20for%20ember-cli%20on%20npmjs.org.%20http://emberaddons.com%22}]}';

    reply.redirect(url);
  }
});


// Run server
server.start(function() {
  console.log('Server running at:', server.info.uri);
});

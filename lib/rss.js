var RSS = require('rss');

var RssFeed = function(options) {
  this.options = options || {};
  this.feed = new RSS(options);
};

RssFeed.prototype.appendItem = function(item) {
  this.feed.item({
    title: item.name,
    description: item.description,
    url: 'https://npmjs.org/package/' + item.name,
    author: item._npmUser.name,
    date: item.time.created
  });
};

RssFeed.prototype.getXml = function(items) {
  items.sort(function(a, b) {
    return b.time.created - a.time.created;
  });

  items.forEach(function(item) {
    this.appendItem(item);
  }, this);
  return this.feed.xml();
};

module.exports = RssFeed;

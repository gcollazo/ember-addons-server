var RSS = require('rss');

var RssFeed = function() {
  this.feed = new RSS({
    title: 'Ember Addons',
    description: 'Listing hundreds of modules that extend ember-cli.',
    'feed_url': 'https://io-builtwithember-addons-data.s3.amazonaws.com/feed.xml',
    'site_url': 'http://addons.builtwithember.io/',
    language: 'en',
    pubDate: new Date()
  });
};

RssFeed.prototype.appendItem = function(item) {
  this.feed.item({
    title: item.name,
    description: item.description,
    url: 'https://npmjs.org/package/' + item.name,
    author: item._npmUser.name
  });
};

RssFeed.prototype.getXml = function() {
  return this.feed.xml();
};

module.exports = RssFeed;

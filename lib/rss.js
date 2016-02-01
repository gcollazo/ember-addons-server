const RSS = require('rss');

module.exports = function(options) {
  const feed = new RSS(options);

  function appendItem(item) {
    feed.item({
      title: item.name,
      description: item.description,
      url: 'https://npmjs.org/package/' + item.name,
      author: item._npmUser.name,
      date: item.time.created
    });
  }

  return function(items) {
    items.map(appendItem);
    return feed.xml();
  };
};

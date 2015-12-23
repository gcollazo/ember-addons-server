var moment = require('moment');

function formatDate(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  if (month < 10) {
    month = '0' + month;
  }

  if (day < 10) {
    day = '0' + day;
  }

  return year + '-' + month + '-' + day;
}

function getDatesInRange(first, last) {
  var start = moment(first);
  var end = moment(last);
  var dates = [formatDate(start.toDate())];

  function getNextDate(date) {
    var next = moment(date.toDate()).add(1, 'days');
    dates.push(formatDate(next.toDate()));

    if (next < end) {
      getNextDate(next);
    }
  }

  getNextDate(start);

  return dates;
}

function format(rows) {
  var result = rows.reduce(function(prev, row) {
    prev[formatDate(row.created)] = row.value;
    return prev;
  }, {});

  var keys = Object.keys(result);
  var dates = getDatesInRange(keys[0], keys[keys.length - 1]);

  var fixedResults = dates.reduce(function(prev, date) {
    var value = result[date] || prev[prev.length - 1].value;

    prev.push({
      created: date,
      value: value
    });

    return prev;
  }, []);

  return fixedResults;
}

module.exports = format;

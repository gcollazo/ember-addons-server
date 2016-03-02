const moment = require('moment');

function formatDate(date) {
  const year = date.getFullYear();
  var month = date.getMonth() + 1; // eslint-disable-line no-var
  var day = date.getDate(); // eslint-disable-line no-var

  if (month < 10) {
    month = `0${month}`;
  }

  if (day < 10) {
    day = `0${day}`;
  }

  return `${year}-${month}-${day}`;
}

function getDatesInRange(first, last) {
  const start = moment(first);
  const end = moment(last);
  const dates = [formatDate(start.toDate())];

  function getNextDate(date) {
    const next = moment(date.toDate()).add(1, 'days');
    dates.push(formatDate(next.toDate()));

    if (next < end) {
      getNextDate(next);
    }
  }

  getNextDate(start);

  return dates;
}

function format(rows) {
  const result = rows.reduce(function(prev, row) {
    prev[formatDate(row.created)] = row.value;
    return prev;
  }, {});

  const keys = Object.keys(result);
  const dates = getDatesInRange(keys[0], keys[keys.length - 1]);

  const fixedResults = dates.reduce(function(prev, date) {
    const value = result[date] || prev[prev.length - 1].value;

    prev.push({
      created: date,
      value: value
    });

    return prev;
  }, []);

  return fixedResults;
}

module.exports = format;

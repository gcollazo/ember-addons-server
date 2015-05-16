var moment = require('moment');

function _dateToYMD(date) {
  var year = date.getFullYear(),
      month = date.getMonth() + 1,
      day = date.getDate();

  if (month < 10) {
    month = '0' + month;
  }

  if (day < 10) {
    day = '0' + day;
  }

  return year + '-' + month + '-' + day;
}

function _sortObject(obj) {
  var keys = Object.keys(obj);
  var sorted = {};
  keys.sort();

  for (var i = 0; i < keys.length; i++) {
    sorted[ keys[ i ] ] = obj[ keys[ i ] ];
  }

  return sorted;
}


function format(rows) {
  var result = {};

  rows.forEach(function(r) {
    result[ _dateToYMD(r.created) ] = r.value;
  });

  var keys = Object.keys(result),
      first = moment(keys[ 0 ]),
      last = moment(keys[ keys.length - 1 ]);

  var current = first,
      nextDay;

  while(current < last) {
    nextDay = current.add(1, 'days');
    // console.log('nextDay:', _dateToYMD(nextDay.toDate()));
    // console.log();
    var thisDay = result[ _dateToYMD(nextDay.toDate()) ];

    if (thisDay === undefined) {
      var prevDay = _dateToYMD(moment(nextDay.toDate()).subtract(1, 'days').toDate());
      result[ _dateToYMD(nextDay.toDate()) ] = result[ prevDay ];
    }
    current = nextDay;
  }

  return _sortObject(result);
}

module.exports = format;

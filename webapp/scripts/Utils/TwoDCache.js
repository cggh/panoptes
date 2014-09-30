// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["Utils/RequestCounter", "Utils/Interval"],
  function (RequestCounter, Interval) {
    return function TwoDCache(col_ordinal, provider, update_callback, row_page_length) {
      var that = {};
      that.init = function (col_ordinal, provider, update_callback, row_page_length) {
        that.col_ordinal = col_ordinal;
        that.provider = provider;
        that.update_callback = update_callback;
        that.request_counter = RequestCounter();

        that.intervals = [];
        that._intervals_being_fetched = [];
        that.provider_queue = [];
        that.current_provider_requests = 0;
        that.row_data_pages = {};
        that.row_page_length = row_page_length;
      };

      that.merge = function (arrays) {
        var length = _.map(arrays, DQX.attr('length')).reduce(function (sum, num) {
          return sum + num;
        });
        //Assumes all are the same type
        var result = new arrays[0].constructor(length);
        var pos = 0;
        _.forEach(arrays, function (array) {
          if (result.set)
            result.set(array, pos);
          else
            for (var i = 0; i < array.length; i++)
              result[i + pos] = array[i];
          pos += array.length;
        });
        return result;
      };

      that.merge2D = function (arrays) {
        arrays = _.filter(arrays, function (array) {
          return array.length > 0;
        });
        if (arrays.length == 0) {
          return [];
        }
        var col_length = _.map(arrays, function (array) {
          return array[0].length;
        }).reduce(function (sum, num) {
          return sum + num;
        });
        var row_length = arrays[0].length;
        //Assumes all are the same type
        var result = _.times(row_length, function () {
          return new arrays[0][0].constructor(col_length);
        });
        var pos = 0;
        _.forEach(arrays, function (array) {
          for (var i = 0; i < row_length; i++)
            if (result[i].set)
              result[i].set(array[i], pos);
            else
              for (var j = 0; j < array[i].length; j++)
                result[i][j + pos] = array[i][j];
          pos += array[0].length;
        });
        result.shape = [arrays[0].shape[0], col_length, arrays[0].shape[2]];
        return result;
      };

      that.find_start = function (array, threshold) {
        var len = array.length;
        var index = -1;
        while (++index < len) {
          if (array[index] >= threshold) {
            break;
          }
        }
        return index;
      };
      that.find_end = function (array, threshold) {
        var index = array.length;
        while (index--) {
          if (array[index] < threshold) {
            break;
          }
        }
        return index + 1;
      };
      that.slice = function (array, start, end) {
        if (array.slice) {
          return array.slice(start, end);
        }
        if (array.subarray) {
          return array.subarray(start, end);
        }
        DQX.reportError('No slice available for array');
      };
      that.twoD_col_slice = function (array, start, end) {
        var result =  _.map(array, function (row) {
          return that.slice(row, start * (array.shape[2] || 1), end * (array.shape[2] || 1));
        });
        result.shape = [array.shape[0], end-start, array.shape[2]];
        return result
      };

      that._collate_data_for = function(req_interval, page) {
        var result = {'row': that.row_data_pages[page] || {}, 'col': {}, 'twoD': {}};
        var matching_intervals_with_data = that.intervals.filter(function (interval) {
          return interval.overlaps(req_interval) && interval.has_fetched(page);
        });

        var interval, col_ordinal_array, start_index, end_index;
        if (matching_intervals_with_data.length == 1) {
          interval = matching_intervals_with_data[0];
          col_ordinal_array = interval.col[that.col_ordinal];
          start_index = that.find_start(col_ordinal_array, req_interval.start);
          end_index = that.find_end(col_ordinal_array, req_interval.end);
          _.forEach(interval.col, function (array, prop) {
            result.col[prop] = that.slice(array, start_index, end_index);
          });
          _.forEach(interval.pages[page].twoD, function (array, prop) {
            result.twoD[prop] = that.twoD_col_slice(array, start_index, end_index);
          });
        } else if (matching_intervals_with_data.length > 1) {
          //Take the matching from the first interval
          interval = matching_intervals_with_data[0];
          col_ordinal_array = interval.col[that.col_ordinal];
          start_index = that.find_start(col_ordinal_array, req_interval.start);
          end_index = col_ordinal_array.length;
          _.forEach(interval.col, function (array, prop) {
            result.col[prop] = [that.slice(array, start_index, end_index)];
          });
          _.forEach(interval.pages[page].twoD, function (array, prop) {
            result.twoD[prop] = [that.twoD_col_slice(array, start_index, end_index)];
          });
          //Then add in the intervals that are fully covered
          for (i = 1; i < matching_intervals_with_data.length - 1; i++) {
            interval = matching_intervals_with_data[i];
            _.forEach(interval.col, function (array, prop) {
              result.col[prop].push(array);
            });
            _.forEach(interval.pages[page].twoD, function (array, prop) {
              result.twoD[prop].push(array);
            });
          }
          //Take the matching from the last interval
          interval = matching_intervals_with_data[matching_intervals_with_data.length - 1];
          col_ordinal_array = interval.col[that.col_ordinal];
          start_index = 0;
          end_index = that.find_start(col_ordinal_array, req_interval.end);
          _.forEach(interval.col, function (array, prop) {
            result.col[prop].push(that.slice(array, start_index, end_index));
          });
          _.forEach(interval.pages[page].twoD, function (array, prop) {
            result.twoD[prop].push(that.twoD_col_slice(array, start_index, end_index));
          });
          //Merge the result
          _.forEach(interval.col, function (array, prop) {
            result.col[prop] = that.merge(result.col[prop]);
          });
          _.forEach(interval.pages[page].twoD, function (array, prop) {
            result.twoD[prop] = that.merge2D(result.twoD[prop]);
          });
        }
        return result
      };

      that._create_missing_intervals = function(req_interval) {
        var matching_intervals = that.intervals.filter(function (interval) {
          return interval.overlaps(req_interval);
        });

        var missing_intervals = [];
        if (matching_intervals.length === 0) {
          missing_intervals.push(new Interval(
              Math.floor(req_interval.start / 1000) * 1000,
              Math.ceil(req_interval.end / 1000) * 1000
          ));
        }
        if (matching_intervals.length > 0) {
          if (req_interval.start < matching_intervals[0].start) {
            missing_intervals.push(new Interval(
                Math.floor(req_interval.start / 1000) * 1000,
              matching_intervals[0].start
            ));
          }
        }
        if (matching_intervals.length > 1) {
          for (var i = 1, ref = matching_intervals.length - 1; i <= ref; i++) {
            if (matching_intervals[i - 1].end !== matching_intervals[i].start) {
              missing_intervals.push(new Interval(
                matching_intervals[i - 1].end,
                matching_intervals[i].start
              ));
            }
          }
        }
        if (matching_intervals.length > 0) {
          var last_match = matching_intervals[matching_intervals.length - 1];
          if (req_interval.end > last_match.end) {
            missing_intervals.push(new Interval(
              last_match.end,
                Math.ceil(req_interval.end / 1000) * 1000
            ));
          }
        }
        //Request small regions at a time to give a sense of progress...
        var resized_missing_intervals = [];
        var threshold = 2000000;
        for (i = 0, ref = missing_intervals.length; i < ref; i++) {
          var interval = missing_intervals[i];
          if (interval.length() < threshold)
            resized_missing_intervals.push(interval);
          else {
            var i_start = interval.start;
            while (i_start + threshold < interval.end) {
              resized_missing_intervals.push(new Interval(i_start, i_start + threshold));
              i_start += threshold;
            }
            resized_missing_intervals.push(new Interval(i_start, interval.end));
          }
        }
        missing_intervals = resized_missing_intervals;
        var bisect = d3.bisector(function (interval) {
          return interval.start;
        }).left;
        for (i = 0, ref = missing_intervals.length; i < ref; i++) {
          interval = missing_intervals[i];
          that.intervals.splice(bisect(that.intervals, interval.start), 0, interval);
        }
        return missing_intervals;
      };

      that.get_by_ordinal = function (col_ord_start, col_ord_end, page, retrieve_missing) {
        var bisect, i, last_match, matching_intervals, missing_intervals, ref;
        if (retrieve_missing == null) retrieve_missing = true;
        var col_ord_req = new Interval(col_ord_start, col_ord_end);

        if (col_ord_req.length() === 0) return {'row': {}, 'col': {}, 'twoD': {}};

        //Grab the data we have already in the cache
        var result = that._collate_data_for(col_ord_req, page);
        if (!retrieve_missing) return result;

        //Create intervals where we have none
        that._create_missing_intervals(col_ord_req);

        //Filter to the intervals that don't have this page and are not fetching it
        //and request it for them
        var to_fetch = that.intervals.filter(function (interval) {
          return interval.overlaps(col_ord_req) && !interval.has_fetched(page) && !interval.is_fetching(page);
        });
        _.forEach(to_fetch, function(interval) {
          interval.fetching.push(page);
          that._intervals_being_fetched.push(interval);
          that._add_to_provider_queue(page, interval);
        });
        result.intervals_being_fetched = that._intervals_being_fetched;
        return result;
      };

      that._add_to_provider_queue = function (page, interval) {
        that.provider_queue.push({page:page, interval:interval});
        if (that.provider_queue.length == 1) {
          that._process_provider_queue()
        }
      };

      that._process_provider_queue = function () {
        if (that.request_counter.free() && that.provider_queue.length > 0) {
          var pi = that.provider_queue.pop();
          that.provider(pi.interval.start, pi.interval.end,
                        pi.page*that.row_page_length, (pi.page+1)*that.row_page_length,
                        that._insert_received_data);
          that.request_counter.increment();
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that._insert_received_data = function (col_ord_start, col_ord_end, row_index_start, row_index_end, data) {
        that.request_counter.decrement();
        var match;
        var interval = new Interval(col_ord_start, col_ord_end);
        match = that.intervals.filter(function (i) {
          return i.equals(interval);
        });
        var page = row_index_start / that.row_page_length;
        if (page !== Math.round(page)) {
          console.log("Data for invalid page");
          return;
        }
        if (match.length !== 1) {
          console.log("Got data for non-existant interval or multiples", col_ord_start, col_ord_end);
          return;
        }
        match = match[0];
        if (!match.is_fetching(page)) {
          console.log("Got data for page not being fetched", col_ord_start, col_ord_end);
          return;
        }
        //Remove from the being fetched list
        that._intervals_being_fetched = that._intervals_being_fetched.filter(function (i) {
          return !i.equals(match);
        });
        match.fetching = _.without(match.fetching, page);
        if (data) {
          match.col = {};
          match.pages[page] = {twoD: {}};
          that.row_data_pages[page] = {};
          var props = _.keys(data);
          for (var i = 0, ref = props.length; i < ref; i++) {
            var full_prop = props[i];
            var type = full_prop.split('_')[0];
            var prop = full_prop.substring(full_prop.indexOf('_') + 1);
            if (type == 'col')
              match.col[prop] = data[full_prop].array;
            if (type == 'row') {
              that.row_data_pages[page][prop] = data[full_prop].array;
            }
            if (type == '2D') {
              var packed = data[full_prop];
              match.pages[page].twoD[prop] = _.times(packed.shape[0], function (i) {
                return that.slice(packed.array, i * packed.shape[1] * (packed.shape[2] || 1), (i + 1) * packed.shape[1] * (packed.shape[2] || 1));
              });
              match.pages[page].twoD[prop].shape = packed.shape;
            }
          }
        }
        that.update_callback();
      };

      that.init(col_ordinal, provider, update_callback, row_page_length);
      return that
    };
  }
);
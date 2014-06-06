// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["Utils/RequestCounter"],
    function (RequestCounter) {
        return function TwoDCache(col_ordinal, provider, update_callback) {
            var that = {};
            that.init = function (col_ordinal, provider, update_callback) {
                that.col_ordinal = col_ordinal;
                that.provider = provider;
                that.update_callback = update_callback;
                that.request_counter = RequestCounter();

                that.intervals = [];
                that._intervals_being_fetched = [];
                that.provider_queue = [];
                that.current_provider_requests = 0;
                that.row_data_fetched = false;
                that.row_data = {};
            };

            that.merge = function (arrays) {
                var length = _.map(arrays, DQX.attr('length')).reduce(function(sum, num) {
                    return sum + num;
                });
                //Assumes all are the same type
                var result = new arrays[0].constructor(length);
                var pos = 0;
                _.forEach(arrays, function(array) {
                    if (result.set)
                      result.set(array,pos);
                    else
                      for (var i = 0; i < array.length;i++)
                        result[i+pos] = array[i];
                    pos += array.length;
                });
                return result;
            };

            that.merge2D = function (arrays) {
                arrays = _.filter(arrays, function(array) {
                    return array.length > 0;
                });
                if (arrays.length == 0) {
                    return [];
                }
                var col_length = _.map(arrays, function(array) {
                    return array[0].length;
                }).reduce(function(sum, num) {
                    return sum + num;
                });
                var row_length = arrays[0].length;
                //Assumes all are the same type
                var result = _.times(row_length, function() {
                    return new arrays[0][0].constructor(col_length);
                });
                var pos = 0;
                _.forEach(arrays, function(array) {
                    for(var i = 0; i < row_length; i++)
                      if (result[i].set)
                        result[i].set(array[i],pos);
                      else
                        for (var j = 0; j < array[i].length;j++)
                          result[i][j+pos] = array[i][j];
                    pos += array[0].length;
                });
                return result;
            };

            that.find_start = function(array, threshold) {
                var len = array.length;
                var index = -1;
                while (++index < len) {
                    if (array[index] >= threshold) {
                        break;
                    }
                }
                return index;
            };
            that.find_end = function(array, threshold) {
                var index = array.length;
                while (index--) {
                    if (array[index] < threshold) {
                        break;
                    }
                }
                return index+1;
            };
            that.slice = function(array, start, end) {
                if (array.slice) {
                    return array.slice(start,end);
                }
                if (array.subarray) {
                    return array.subarray(start,end);
                }
                DQX.reportError('No slice available for array');
            };
            that.twoD_col_slice = function(array, start, end) {
                return _.map(array, function(row) {
                    return that.slice(row, start, end);
                });
            };

            //TODO Chunk requests to a multiple of 10 boundary or something to prevent small intervals
            that.get_by_ordinal = function (start, end, retrieve_missing) {
                var bisect, i, last_match, matching_intervals, missing_intervals, ref;
                var result = {'row':that.row_data, 'col':{}, 'twoD':{}};
                if (retrieve_missing == null) retrieve_missing = true;
                if (start < 0) start = 0;
                if (end < 0) end = 0;
                if (start == end) return result;
                matching_intervals = that.intervals.filter(function (interval) {
                    return interval.start <= end && start <= interval.end;
                });
                var matching_intervals_with_data = matching_intervals.filter(function (interval) {
                    return interval.fetched == true;
                });
                var interval, col_ordinal_array, start_index, end_index;
                if (matching_intervals_with_data.length == 1) {
                    interval = matching_intervals_with_data[0];
                    col_ordinal_array = interval.col[that.col_ordinal];
                    start_index = that.find_start(col_ordinal_array, start);
                    end_index = that.find_end(col_ordinal_array, end);
                    _.forEach(interval.col, function(array, prop) {
                        result.col[prop] = that.slice(array, start_index, end_index);
                    });
                    _.forEach(interval.twoD, function(array, prop) {
                        result.twoD[prop] = that.twoD_col_slice(array, start_index, end_index);
                    });
                } else if (matching_intervals_with_data.length > 1) {
                    //Take the matching from the first interval
                    interval = matching_intervals_with_data[0];
                    col_ordinal_array = interval.col[that.col_ordinal];
                    start_index = that.find_start(col_ordinal_array, start);
                    end_index = col_ordinal_array.length;
                    _.forEach(interval.col, function(array, prop) {
                        result.col[prop] = [that.slice(array, start_index, end_index)];
                    });
                    _.forEach(interval.twoD, function(array, prop) {
                        result.twoD[prop] = [that.twoD_col_slice(array, start_index, end_index)];
                    });
                    //Then add in the intervals that are fully covered
                    for (i=1; i < matching_intervals_with_data.length - 1; i++) {
                        interval = matching_intervals_with_data[i];
                        _.forEach(interval.col, function(array, prop) {
                            result.col[prop].push(array);
                        });
                        _.forEach(interval.twoD, function(array, prop) {
                            result.twoD[prop].push(array);
                        });
                    }
                    //Take the matching from the last interval
                    interval = matching_intervals_with_data[matching_intervals_with_data.length - 1];
                    col_ordinal_array = interval.col[that.col_ordinal];
                    start_index = 0;
                    end_index = that.find_start(col_ordinal_array, end);
                    _.forEach(interval.col, function(array, prop) {
                        result.col[prop].push(that.slice(array, start_index, end_index));
                    });
                    _.forEach(interval.twoD, function(array, prop) {
                        result.twoD[prop].push(that.twoD_col_slice(array, start_index, end_index));
                    });
                    //Merge the result
                    _.forEach(interval.col, function(array, prop) {
                        result.col[prop] = that.merge(result.col[prop]);
                    });
                    _.forEach(interval.twoD, function(array, prop) {
                        result.twoD[prop] = that.merge2D(result.twoD[prop]);
                    });
                }
                if (!retrieve_missing) return result;
                missing_intervals = [];
                if (matching_intervals.length === 0) {
                    missing_intervals.push({
                        'start': Math.floor(start/1000)*1000,
                        'end': Math.ceil(end/1000)*1000
                    });
                }
                if (matching_intervals.length > 0) {
                    if (start < matching_intervals[0].start) {
                        missing_intervals.push({
                            'start': Math.floor(start/1000)*1000,
                            'end': matching_intervals[0].start
                        });
                    }
                }
                if (matching_intervals.length > 1) {
                    for (i = 1, ref = matching_intervals.length - 1; i <= ref; i++) {
                        if (matching_intervals[i - 1].end !== matching_intervals[i].start) {
                            missing_intervals.push({
                                'start': matching_intervals[i - 1].end,
                                'end': matching_intervals[i].start
                            });
                        }
                    }
                }
                if (matching_intervals.length > 0) {
                    last_match = matching_intervals[matching_intervals.length - 1];
                    if (end > last_match.end) {
                        missing_intervals.push({
                            'start': last_match.end,
                            'end': Math.ceil(end/1000)*1000
                        });
                    }
                }
                bisect = d3.bisector(function (interval) {
                    return interval.start;
                }).left;
                //Request small regions at a time to give a sense of progress...
                var resized_missing_intervals = [];
                var threshold = 2000000;
                for (i = 0, ref = missing_intervals.length; i < ref; i++) {
                    interval = missing_intervals[i];
                    if (interval.end - interval.start < threshold)
                        resized_missing_intervals.push(interval);
                    else {
                        var i_start = interval.start;
                        while (i_start + threshold < interval.end) {
                            resized_missing_intervals.push({start: i_start, end: i_start + threshold});
                            i_start += threshold;
                        }
                        resized_missing_intervals.push({start: i_start, end: interval.end});
                    }
                }
                missing_intervals = resized_missing_intervals;

                for (i = 0, ref = missing_intervals.length; i < ref; i++) {
                    interval = missing_intervals[i];
                    interval.fetched = false;
                    that._intervals_being_fetched.push(interval);
                    that.intervals.splice(bisect(that.intervals, interval.start), 0, interval);
                    that._add_to_provider_queue(interval);
                }
                return result;
            };

            that._add_to_provider_queue = function (interval) {
                that.provider_queue.push(interval);
                if (that.provider_queue.length == 1) {
                    that._process_provider_queue()
                }
            };

            that._process_provider_queue = function () {
                if (that.request_counter.free() && that.provider_queue.length > 0) {
                    var interval = that.provider_queue.pop();
                    that.provider(interval.start, interval.end, that._insert_received_data);
                    that.request_counter.increment();
                }
                if (that.provider_queue.length > 0) {
                    setTimeout(that._process_provider_queue, 100);
                }
            };

            that._insert_received_data = function (start, end, data) {
                that.request_counter.decrement();
                var match;
                match = that.intervals.filter(function (i) {
                    return i.start === start && i.end === end;
                });
                //Remove from the being fetched list
                that._intervals_being_fetched = that._intervals_being_fetched.filter(function (i) {
                    return i.start != match[0].start;
                });
                if (match.length !== 1) {
                    console.log("Got data for non-existant interval or multiples", start, end);
                    return;
                }
                match = match[0];
                if (data) {
                    match.fetched = true;
                    match.col = {};
                    match.twoD = {};
                    var props = _.keys(data);
                    for (var i = 0, ref = props.length; i < ref; i++) {
                        var full_prop = props[i];
                        var type = full_prop.split('_')[0];
                        var prop = full_prop.substring(full_prop.indexOf('_')+1);
                        if (type == 'col')
                            match.col[prop] = data[full_prop].array;
                        if (type == 'row')
                            that.row_data[prop] = data[full_prop].array;
                        if (type == '2D') {
                            var packed = data[full_prop];
                            match.twoD[prop] = _.times(packed.shape[0], function(i) {
                                return that.slice(packed.array, i*packed.shape[1], (i+1)*packed.shape[1]);
                            });
                        }

                    }
                    //TODO MERGE TO NEIGHBOURS
                } else {
                    that.intervals = that.intervals.filter(function (i) {
                        return i.elements !== null;
                    });
                }
                that.update_callback();
            };

            that.init(col_ordinal, provider, update_callback);
            return that
        };
    }
);
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

            that.merge = function (array, other) {
                return Array.prototype.push.apply(array, other);
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
                return index;
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
                if (retrieve_missing == null) retrieve_missing = true;
                if (start < 0) start = 0;
                if (end < 0) end = 0;
                if (start == end) return [];
                matching_intervals = that.intervals.filter(function (interval) {
                    return interval.start <= end && start <= interval.end;
                });
                var matching_intervals_with_data = matching_intervals.filter(function (interval) {
                    return interval.fetched == true;
                });
                var result = {'row':that.row_data, 'col':{}, 'twoD':{}};
                if (matching_intervals_with_data.length == 1) {
                    var interval = matching_intervals_with_data[0];
                    var col_ordinal_array = interval.col[that.col_ordinal];
                    var start_index = that.find_start(col_ordinal_array, start);
                    var end_index = that.find_end(col_ordinal_array, end);
                    _.forEach(interval.col, function(array, prop) {
                        result.col[prop] = that.slice(array, start_index, end_index);
                    });
                    _.forEach(interval.twoD, function(array, prop) {
                        result.twoD[prop] = that.twoD_col_slice(array, start_index, end_index);
                    });
                } else {
                    console.log('boom');
                }
                if (!retrieve_missing) return result;
                missing_intervals = [];
                if (matching_intervals.length === 0) {
                    missing_intervals.push({
                        'start': start,
                        'end': end
                    });
                }
                if (matching_intervals.length > 0) {
                    if (start < matching_intervals[0].start) {
                        missing_intervals.push({
                            'start': start,
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
                            'end': end
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
                            match.col[prop] = data[full_prop];
                        if (type == 'row')
                            that.row_data[prop] = data[full_prop];
                        if (type == '2D') {
                            var packed = data[full_prop];
                            match.twoD[prop] = _.times(packed.shape[0], function(i) {
                                return that.slice(packed, i*packed.shape[1], (i+1)*packed.shape[1]);
                            });
                        }

                    }
                    //TODO MERGE TO NEIGHBOURS
                } else {
                    that.intervals = that.intervals.filter(function (i) {
                        return i.elements !== null;
                    });
                }
            };

            that.init(col_ordinal, provider, update_callback);
            return that
        };
    }
);
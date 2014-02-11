define(["Utils/RequestCounter"],
    function (RequestCounter) {
        return function TwoDCache(col_ordinal, properties, provider) {
            var that = {};
            that.init = function (col_ordinal, properties, provider) {
                that.col_ordinal = col_ordinal;
                that.properties = properties;
                that.provider = provider;
                that.request_counter = RequestCounter();

                that.intervals = [];
                that._intervals_being_fetched = [];
                that.provider_queue = [];
                that.current_provider_requests = 0;
            };

            that.merge = function (array, other) {
                return Array.prototype.push.apply(array, other);
            };

            //TODO Chunk requests to a multiple of 10 boundary or something to prevent small intervals
            that.get_by_pos = function (start, end, retrieve_missing) {
                var bisect, i, interval, last_match, matched_elements, matching_intervals, missing_intervals, ref;
                if (retrieve_missing == null) retrieve_missing = true;
                if (start < 0) start = 0;
                if (end < 0) end = 0;
                if (start == end) return [];
                matching_intervals = that.intervals.filter(function (interval) {
                    return interval.start <= end && start <= interval.end;
                });
                matched_elements = [];
                if (matching_intervals.length > 0) {
                    that.merge(matched_elements, matching_intervals[0].elements.filter(function (element) {
                        var l = element[that.col_ordinal];
                        return l >= start && l < end;
                    }));
                }
                if (matching_intervals.length > 2) {
                    for (i = 1, ref = matching_intervals.length - 2; i <= ref; i++) {
                        that.merge(matched_elements, matching_intervals[i].elements);
                    }
                }
                if (matching_intervals.length > 1) {
                    that.merge(matched_elements, matching_intervals[matching_intervals.length - 1].elements.filter(function (element) {
                        var l = element[col_ordinal];
                        return l >= start && l < end;
                    }));
                }
                if (!retrieve_missing) return matched_elements;
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
                    that._intervals_being_fetched.push(interval);
                    that.intervals.splice(bisect(that.intervals, interval.start), 0, interval);
                    interval.elements = [];
                    that._add_to_provider_queue(interval);
                }
                return matched_elements;
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
                that._intervals_being_fetched = that._intervals_being_fetched.filter(function (i) {
                    return i.start != match[0].start;
                });
                if (match.length !== 1) {
                    console.log("Got data for non-existant interval or multiples", start, end);
                    return;
                }
                if (data) {
                    match[0].elements = data;
                    if (that.indexer) {
                        data.forEach(function (element) {
                            that.indexed[that.indexer(element)] = element;
                        });
                    }
                } else {
                    match[0].elements = null;
                    that.intervals = that.intervals.filter(function (i) {
                        return i.elements !== null;
                    });
                }
            };

            that.init(col_ordinal, properties, provider);
            return that
        };
    }
);
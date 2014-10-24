// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of that license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["Utils/RequestCounter"],
  function (RequestCounter) {
    return function Cache(provider, update_callback, limit) {
      var that = {};
      that.init = function (provider, update_callback, limit) {
        that.provider = provider;
        that.update_callback = update_callback;
        that.request_counter = RequestCounter();

        that.cache = {};
        that.lru = [];
        that.limit = limit;

        that._keys_being_fetched = [];
        that.provider_queue = [];
        that.current_provider_requests = 0;
      };

      that.get = function (key, retrieve_missing) {
        if (retrieve_missing == null) retrieve_missing = true;
        key = JSON.stringify(key);

        //Grab the data we have already in the cache
        var result = that.cache[key];
        if (result) {
          that.lru = _.without(that.lru, key);
          that.lru.push(key);
          return result;
        }
        if (!retrieve_missing) return null;

        if (_.indexOf(that.lru, key) !== -1)
          return;
        that.lru.push(key);
        if (that.lru.length > that.limit) {
          that.cache[that.lru[0]] = null;
          that.lru = that.lru.slice(1);
        }
        that._add_to_provider_queue(key);
        return null;
      };

      that._add_to_provider_queue = function (key) {
        that._keys_being_fetched.push(key);
        that.provider_queue.push(key);
        if (that.provider_queue.length == 1) {
          that._process_provider_queue()
        }
      };

      that._process_provider_queue = function () {
        if (that.request_counter.free() && that.provider_queue.length > 0) {
          var key = that.provider_queue.pop();
          that.provider(key,
                        that._insert_received_data);
          that.request_counter.increment();
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that._insert_received_data = function (key, data) {
        //Check that these data are still wanted
        if (_.indexOf(that.lru, key) === -1)
          return;
        that.cache[key] = data;
        that.request_counter.decrement();
        that.update_callback();
      };

      that.init(provider, update_callback, limit);
      return that
    };
  }
);
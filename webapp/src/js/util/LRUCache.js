import _has from 'lodash.has';
import _without from 'lodash.without';
import Q from 'q';

const CANCELLED = {status: '__CANCELLED__'};

//Global cache with max num of refs
let LRUCache = {
  MAX_ENTRIES: 10000,
  cache: {},
  lru: [],
  cancellers: {},
  numberWaitingFor: {},

  clear() {
    LRUCache.cache =  {};
    LRUCache.lru = [];
  },

  get(key, method, cancellation = null, fetchIfAbsent = true) {
    let present = _has(this.cache, key);
    if (!present && !fetchIfAbsent)
      return null;

    if (present) {
      //Make the key be the most recent used
      this.lru = _without(this.lru, key);
      this.lru.push(key);
    } else {
      this.lru.push(key);
      //Insert a promise into the cache
      this.cancellers[key] = Q.defer();
      this.cache[key] = method(this.cancellers[key].promise)
        .then((data) => {
          //If the promise completes we check the cache hasn't gotten too large.
          if (this.lru.length > this.MAX_ENTRIES) {
            delete this.cache[this.lru[0]];
            this.lru = this.lru.slice(1);
          }
          delete this.cancellers[key];
          return data;
        })
        .catch((err) => {
          //If the promise fails we remove it's entry altogether
          delete this.cache[key];
          delete this.cancellers[key];
          this.lru = _without(this.lru, key);
          throw err;
        });
    }
    //We now have a promise in the cache, either fulfilled or not.
    let returned = Q.defer();
    this.numberWaitingFor[key] || (this.numberWaitingFor[key] = 0);
    this.numberWaitingFor[key] += 1;
    cancellation.then(() => {
      this.numberWaitingFor[key] -= 1;
      //If none are left waiting then kill the request
      if (this.numberWaitingFor[key] === 0 && this.cancellers[key]) {
        this.cancellers[key].resolve(); //This cancels the backend request
      }
      returned.reject(CANCELLED);
    });
    this.cache[key].then((data) => {
      this.numberWaitingFor[key] -= 1;
      returned.resolve(data);
    });
    this.cache[key].catch((err) => {
      this.numberWaitingFor[key] = 0;
      returned.reject(err);
    });

    return returned.promise;
  },

  filterCancelled(err) {
    if (err !== CANCELLED) {
      throw err;
    } else {
      return '__CANCELLED__';
    }
  }
};

export default LRUCache;


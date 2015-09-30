const _ = require('lodash');
const Q = require('q');

//Global cache with max num of refs
let LRUCache = {
  MAX_ENTRIES: 10000,
  cache: {},
  lru: [],
  pending: {},

  get(namespace, args, provider, invalidationID, fetchIfAbsent=true) {
    let key = namespace+JSON.stringify(args);
    let present = _.has(this.cache, key);
    if (!present && !fetchIfAbsent)
      return null;
    if (present) {
      //Make the key be the most recent used
      this.lru = _.without(this.lru, key);
      this.lru.push(key);
    } else {
      this.lru.push(key);
      //Insert a promise into the cache
      this.cache[key] = provider.apply(this, args)
        .then((data) => {
          //If the promise completes we check the cache hasn't gotten too large.
          if (this.lru.length > this.MAX_ENTRIES) {
            delete this.cache[this.lru[0]];
            this.lru = this.lru.slice(1);
          }
          return data;
        })
        .catch(() => {
          //If the promise fails we remove it's entry altogether
          delete this.cache[key];
          this.lru = _.without(this.lru, key);
        });
    }
    //We now have a promise in the cache if this request can't be invalidated just return the promise
    if (!invalidationID || this.cache[key].isFulfilled())
      return this.cache[key];
    else {
      //If this request comes after one with the same ID we reject the former one.
      //If it hasn't completed then it will ativate the client's catch block
      //If it has activated this will do nothing
      if (this.pending[invalidationID])
        this.pending[invalidationID].reject('SUPERSEDED');
      //Store a promise that is resolved when the actual request is. If the line above rejects before this then this will do nothing as desired.
      let deferred = this.pending[invalidationID] = Q.defer();
      this.cache[key].then((data) => {
        return deferred.resolve(data);
      })
        .catch((err) => deferred.reject(err));
      return deferred.promise;
    }

  }
};

module.exports = LRUCache;


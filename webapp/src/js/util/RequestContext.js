const Q = require('q');


class RequestContext {
  constructor() {
    this.canceller = null;
  }

  request(method, args) {
    if (this.canceller)
      this.canceller.resolve();
    this.canceller = Q.defer();
    return method(Object.assign(args, {cancellation: this.canceller.promise}))
  }

  destroy() {
    if (this.canceller)
      this.canceller.resolve();
  }
}


module.exports = RequestContext;

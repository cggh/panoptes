import Q from 'q';


class RequestContext {
  constructor() {
    this.canceller = null;
  }

  request(method) {
    if (this.canceller)
      this.canceller.resolve();
    this.canceller = Q.defer();
    return method(this.canceller.promise);
  }

  destroy() {
    if (this.canceller)
      this.canceller.resolve();
  }
}


export default RequestContext;

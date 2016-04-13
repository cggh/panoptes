// A class to help create a URL with query parameters.
class URL {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.queryParams = [];
  }

  addQueryParam(name, value) {
    this.queryParams.push({name, value});
  }

  toString() {
    let fullURL = this.baseURL;
    if (this.queryParams.length > 0) {
      fullURL += '?';
      for (let i = 0, len = this.queryParams.length; i < len; i++) {
        if (i > 0) fullURL += '&';
        fullURL += this.queryParams[i].name + '=' + this.queryParams[i].value;
      }
    }
    return fullURL;
  }

}

module.exports = URL;

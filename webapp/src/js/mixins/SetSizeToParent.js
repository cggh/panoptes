
const detectResize = require('util/DetectElementResize');

var SetSizeToParent = {
  getInitialState: function(){
    return {
      width: 0,
      height: 0
    };
  },

  componentDidMount : function(){
    this._onResize();
    detectResize.addResizeListener(this.getDOMNode().parentNode, this._onResize);
  },

  componentWillUnmount : function(){
    detectResize.removeResizeListener(this.getDOMNode().parentNode, this._onResize);
  },

  _onResize : function() {
    var node = this.getDOMNode();

    this.setState({
      width:node.offsetWidth,
      height:node.offsetHeight,
    });
  }
};

module.exports = SetSizeToParent;

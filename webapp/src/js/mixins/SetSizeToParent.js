const ReactDOM =require('react-dom');
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
    detectResize.addResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize);
  },

  componentWillUnmount : function(){
    detectResize.removeResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize);
  },

  _onResize : function() {
    var node = ReactDOM.findDOMNode(this);

    this.setState({
      width:node.offsetWidth,
      height:node.offsetHeight,
    });
  }
};

module.exports = SetSizeToParent;

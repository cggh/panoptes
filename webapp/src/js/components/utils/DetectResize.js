import React from 'react';
import ReactDOM from 'react-dom';
import detectResize from 'util/DetectElementResize';

let DetectResize = React.createClass({

  propTypes: {
    onResize: React.PropTypes.func,
    children: React.PropTypes.element.isRequired
  },

  componentDidMount: function() {
    this._onResize();
    detectResize.addResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize);
  },

  componentWillUnmount: function() {
    detectResize.removeResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize);
  },

  _onResize: function() {
    let node = ReactDOM.findDOMNode(this);
    if (this.props.onResize)
      this.props.onResize({
        width: node.offsetWidth,
        height: node.offsetHeight
      });
  },

  render: function() {
    return React.cloneElement(React.Children.only(this.props.children));
  }
});

module.exports = DetectResize;

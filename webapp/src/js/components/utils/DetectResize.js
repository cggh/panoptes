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
    detectResize.addResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize); //eslint-disable-line react/no-find-dom-node
  },

  componentWillUnmount: function() {
    detectResize.removeResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize); //eslint-disable-line react/no-find-dom-node
  },

  _onResize: function() {
    let node = ReactDOM.findDOMNode(this); //eslint-disable-line react/no-find-dom-node
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

export default DetectResize;

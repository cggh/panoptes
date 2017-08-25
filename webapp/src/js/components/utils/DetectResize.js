import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import detectResize from 'util/DetectElementResize';

class DetectResize extends React.Component {
  static propTypes = {
    onResize: PropTypes.func,
    children: PropTypes.element.isRequired
  };

  componentDidMount() {
    this._onResize();
    detectResize.addResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize); //eslint-disable-line react/no-find-dom-node
  }

  componentWillUnmount() {
    detectResize.removeResizeListener(ReactDOM.findDOMNode(this).parentNode, this._onResize); //eslint-disable-line react/no-find-dom-node
  }

  _onResize = () => {
    let node = ReactDOM.findDOMNode(this); //eslint-disable-line react/no-find-dom-node
    if (this.props.onResize)
      this.props.onResize({
        width: node.offsetWidth,
        height: node.offsetHeight
      });
  };

  render() {
    return React.cloneElement(React.Children.only(this.props.children));
  }
}

export default DetectResize;

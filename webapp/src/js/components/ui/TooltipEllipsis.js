import React from 'react';
import ReactDOM from 'react-dom';
import PureRenderMixin from 'mixins/PureRenderMixin';

import 'tooltip-ellipsis.scss';

let TooltipEllipsis = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    className: React.PropTypes.string
  },

  componentDidUpdate() {
    let e = ReactDOM.findDOMNode(this.refs.element);
    if (e.offsetWidth < e.scrollWidth)
      e.title = this.props.children;
  },

  render() {
    return (
      <span className={this.props.className + ' tooltip-ellipsis'} ref="element">
        {this.props.children}
      </span>
    );
  }

});

module.exports = TooltipEllipsis;

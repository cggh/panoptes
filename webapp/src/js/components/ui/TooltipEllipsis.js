import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import 'tooltip-ellipsis.scss';

let TooltipEllipsis = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.any
  },

  componentDidUpdate() {
    if (this.element.offsetWidth < this.element.scrollWidth)
      this.element.title = this.props.children;
  },

  render() {
    return (
      <span className={this.props.className + ' tooltip-ellipsis'} ref={(node) => this.element = node}>
        {this.props.children}
      </span>
    );
  }

});

module.exports = TooltipEllipsis;

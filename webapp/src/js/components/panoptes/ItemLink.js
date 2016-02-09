import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

let ItemLink = React.createClass({

  mixins: [PureRenderMixin],

  render() {
    let {children, ...other} = this.props;
    return (
      <a {...other}>
        {children}
      </a>
    );
  }

});

module.exports = ItemLink;

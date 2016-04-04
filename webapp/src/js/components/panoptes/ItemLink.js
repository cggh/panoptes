import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

let ItemLink = React.createClass({

  mixins: [PureRenderMixin],

  render() {
    let {table, primaryKey} = this.props;
    // TODO: How is the href meant to be constructed?
    return (
      <a href={table + '?' + primaryKey}>
        {primaryKey}
      </a>
    );
  }

});

module.exports = ItemLink;

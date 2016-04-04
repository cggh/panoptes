import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

let ItemLink = React.createClass({

  mixins: [PureRenderMixin],

  render() {
    let {table, primKey} = this.props;
    // TODO: How is the href meant to be constructed?
    return (
      <a href={table + '?' + primKey}>
        {primKey}
      </a>
    );
  }

});

module.exports = ItemLink;

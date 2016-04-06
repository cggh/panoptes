import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ItemLink = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  render() {
    let {table, primKey} = this.props;

    let actions = this.getFlux().actions;

    return (
      <a href="javascript:void(0)" onClick={() => actions.panoptes.dataItemPopup({table: table, primKey: primKey.toString()})}>
        {primKey}
      </a>
    );
  }

});

module.exports = ItemLink;

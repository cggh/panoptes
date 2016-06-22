import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ItemLink = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  handleClick(e) {
    let {table, primKey} = this.props;
    e.stopPropagation();
    this.getFlux().actions.panoptes.dataItemPopup({table: table, primKey: primKey.toString()});
  },

  // TODO: primKey might need formatting (using panoptes/Formatter) but would need property.isBoolean, etc.

  render() {
    let {primKey} = this.props;
    return (
      <span
        className="prop internal-link"
        onClick={(e) => this.handleClick(e)}
      >
      {primKey}
      </span>
    );
  }

});

module.exports = ItemLink;

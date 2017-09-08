import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ItemLink = createReactClass({
  displayName: 'ItemLink',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    table: PropTypes.string,
    primKey: PropTypes.string
  },

  handleClick(e) {
    let {table, primKey} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
      e.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey: primKey.toString(), switchTo: !middleClick});
  },

  // TODO: primKey might need formatting (using panoptes/Formatter) but would need property.isBoolean, etc.

  render() {
    let {primKey, children} = this.props;
    if (!children) {
      return (
        <span
          className="prop internal-link"
          onClick={(e) => this.handleClick(e)}
        >
          {primKey}
        </span>
      );
    } else {
      return <span style={{cursor: 'pointer'}} onClick={(e) => this.handleClick(e)}>{children}</span>;
    }
  },
});

export default ItemLink;

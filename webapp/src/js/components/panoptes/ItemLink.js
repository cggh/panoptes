import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';
import Button from 'ui/Button';
import Icon from 'ui/Icon';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

let ItemLink = createReactClass({
  displayName: 'ItemLink',

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    table: PropTypes.string,
    primKey: PropTypes.string,
    button: PropTypes.bool,
    children: PropTypes.node,
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
    let {table, primKey, children, button} = this.props;
    if (!children) {
      return (
        <span
          className="prop internal-link"
          onClick={(e) => this.handleClick(e)}
        >
          {primKey}
        </span>
      );
    } else if (button) {
      return (
        <Button
          onClick={(e) => this.handleClick(e)}
          icon={<Icon name={this.config.tablesById[table].icon} />}
          color="default"
          label={children}
          iconName="circle"
          raised={true}
          target="popup"
        />
      );
    } else {
      return <span style={{cursor: 'pointer'}} onClick={(e) => this.handleClick(e)}>{children}</span>;
    }
  },
});

export default ItemLink;

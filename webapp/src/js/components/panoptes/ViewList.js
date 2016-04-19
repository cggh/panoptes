import React from 'react';
import _some from 'lodash/some';
import _filter from 'lodash/filter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Icon from 'ui/Icon';

let ViewList = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin
  ],

  propTypes: {
    style: React.PropTypes.object,
    onClick: React.PropTypes.func.isRequired
  },


  handleOpen(e, container, props) {
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    this.props.onClick({container, props, middleClick});
  },


  render() {
    const hasGeo = _some(_filter(this.config.tables, {hasGeoCoord: true}));
    return (
        <List style={this.props.style}>
          <Subheader>Open a view:</Subheader>
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/GenomeBrowserWithActions', {})} />
          <ListItem primaryText="Plot"
                    secondaryText="View table data graphically"
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/PlotWithActions', {})} />
          <ListItem primaryText="Map"
                    disabled={!hasGeo}
                    style={{opacity: hasGeo ? '1' : '0.5'}}
                    secondaryText={hasGeo ? 'View table data geographically' : 'None of your tables have geographic data'}
                    leftIcon={<div><Icon fixedWidth={true} name="globe"/></div>}
                    onClick={hasGeo ? (e) => this.handleOpen(e, 'containers/MapWithActions', {}) : null } />
        </List>
    );
  }
});

module.exports = ViewList;

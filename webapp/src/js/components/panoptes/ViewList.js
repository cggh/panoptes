import React from 'react';
import _some from 'lodash/some';
import _filter from 'lodash/filter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Icon from 'ui/Icon';

let ViewList = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    style: React.PropTypes.object,
    onClick: React.PropTypes.func.isRequired
  },


  handleOpen(e, container, props) {
    const middleClick = e.button == 1 || e.metaKey || e.ctrlKey;
    this.props.onClick({container, props, middleClick});
  },


  render() {
    const hasShowableTables = _some(this.config.visibleTables);
    const hasGeo = _some(_filter(this.config.tablesById, {hasGeoCoord: true}));

    return (
      <List style={this.props.style}>
        <Subheader>Open a view:</Subheader>
        {this.config.user.isManager ?
          <ListItem primaryText="Dataset Manager"
                    secondaryText="Import and configure datasets"
                    leftIcon={<div><Icon fixedWidth={true} name="database"/></div>}
                    onClick={(e) => this.handleOpen(e, 'DatasetManager/Actions', {})}/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/GenomeBrowserWithActions', {})}/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Plot"
                    secondaryText="View table data graphically"
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/PlotWithActions', {})}/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Map"
                    disabled={!hasGeo}
                    style={{opacity: hasGeo ? '1' : '0.5'}}
                    secondaryText={hasGeo ? 'View table data geographically' : 'None of your tables have geographic data'}
                    leftIcon={<div><Icon fixedWidth={true} name="globe"/></div>}
                    onClick={hasGeo ? (e) => this.handleOpen(e, 'AwesomeMap/Actions', {}) : null }/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Tree"
                    secondaryText="View a tree"
                    leftIcon={<div><Icon fixedWidth={true} name="tree"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/TreeWithActions', {})}/>
          : null}
      </List>
    );
  }
});

module.exports = ViewList;

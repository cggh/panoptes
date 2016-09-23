import React from 'react';
import _some from 'lodash/some';
import _filter from 'lodash/filter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Icon from 'ui/Icon';
import GenomeBrowserWithActions from 'containers/GenomeBrowserWithActions';
import ReferenceSequence from 'panoptes/genome/tracks/ReferenceSequence';
import AnnotationChannel from 'panoptes/genome/tracks/AnnotationChannel';

import DatasetManagerActions from 'Dataset/Manager/Actions';
import PlotWithActions from 'Plot/Table/Actions';
import MapActions from 'Map/Actions';
import TreeWithActions from 'containers/TreeWithActions';

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


  handleOpen(e, component) {
    const middleClick = e.button == 1 || e.metaKey || e.ctrlKey;
    this.props.onClick({component, middleClick});
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
                    onClick={(e) => this.handleOpen(e, <DatasetManagerActions />)}/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e,
                      <GenomeBrowserWithActions>
                        <ReferenceSequence fixed/>
                        <AnnotationChannel fixed/>
                      </GenomeBrowserWithActions>
                        )}/>
          : null}
        {hasShowableTables ?
          <ListItem primaryText="Table Plotter"
                    secondaryText="View table data graphically"
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart"/></div>}
                    onClick={(e) => this.handleOpen(e, <PlotWithActions />)}/>
          : null}
          <ListItem primaryText="Map Composer"
                    style={{opacity: 1}}
                    secondaryText={'View data geographically'}
                    leftIcon={<div><Icon fixedWidth={true} name="globe"/></div>}
                    onClick={(e) => this.handleOpen(e, <MapActions />)}/>
        {hasShowableTables ?
          <ListItem primaryText="Tree"
                    secondaryText="View a tree"
                    leftIcon={<div><Icon fixedWidth={true} name="tree"/></div>}
                    onClick={(e) => this.handleOpen(e, <TreeWithActions />)}/>
          : null}
      </List>
    );
  }
});

module.exports = ViewList;

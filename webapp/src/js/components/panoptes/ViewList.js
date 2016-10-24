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
    const hasTrees = _some(_filter(this.config.visibleTables, (table) => table.trees));

    return (
      <List style={this.props.style}>
        <Subheader>Open a view:</Subheader>
        {this.config.user.isManager ?
          <ListItem primaryText="Dataset Manager"
                    secondaryText="Import and configure datasets"
                    leftIcon={<div><Icon fixedWidth={true} name="database"/></div>}
                    onClick={(e) => this.handleOpen(e, <DatasetManagerActions />)}/>
          : null}
        <ListItem primaryText="Genome Browser"
                  secondaryText="View table data and sequence data on the genome"
                  leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                  onClick={(e) => this.handleOpen(e,
                    <GenomeBrowserWithActions>
                      <ReferenceSequence fixed/>
                      <AnnotationChannel fixed/>
                    </GenomeBrowserWithActions>
                      )}/>
          <ListItem primaryText="Table Plotter"
                    disabled={!hasShowableTables}
                    innerDivStyle={{opacity: hasShowableTables ? 'inherit' :0.5}}
                    secondaryText={hasShowableTables ? "View table data graphically" : "No table data to plot"}
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart"/></div>}
                    onClick={(e) => this.handleOpen(e, <PlotWithActions />)}/>
          <ListItem primaryText="Map Composer"
                    style={{opacity: 1}}
                    secondaryText={'View data geographically'}
                    leftIcon={<div><Icon fixedWidth={true} name="globe"/></div>}
                    onClick={(e) => this.handleOpen(e, <MapActions />)}/>
          <ListItem primaryText="Tree Plotter"
                    disabled={!hasTrees}
                    innerDivStyle={{opacity: hasTrees ? 'inherit' :0.5}}
                    secondaryText={hasTrees ? "View a neighbour joining tree" : "No tree data to plot"}
                    leftIcon={<div><Icon fixedWidth={true} name="tree"/></div>}
                    onClick={(e) => this.handleOpen(e, <TreeWithActions />)}/>
      </List>
    );
  }
});

module.exports = ViewList;

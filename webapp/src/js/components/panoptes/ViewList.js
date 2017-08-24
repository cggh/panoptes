import React from 'react';
import _some from 'lodash.some';
import _filter from 'lodash.filter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Icon from 'ui/Icon';
import GenomeBrowserWithActions from 'containers/GenomeBrowserWithActions';

import DatasetManagerActions from 'DatasetManagerActions';
import TablePlotActions from 'TablePlotActions';
import MapActions from 'Map/MapActions';
import TreeWithActions from 'containers/TreeWithActions';

let ViewList = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    style: React.PropTypes.object,
    onClick: React.PropTypes.func
  },

  handleOpen(e, component) {
    const middleClick = e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
        e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
    }
    (this.props.onClick || this.handleClick)({component, middleClick});
  },

  handleClick({component, middleClick}) {
    if (middleClick)
      this.flux.actions.session.tabOpen(component, false);
    else {
      this.flux.actions.session.tabOpen(component, true);
    }
  },

  render() {
    const hasShowableTables = _some(this.config.visibleTables);
    const hasTrees = _some(_filter(this.config.visibleTables, (table) => table.trees));
    const hasShowableGeoCoordTables = _some(_filter(this.config.visibleTables, (table) => table.hasGeoCoord));
    const hasMapLayers = _some(this.config.mapLayers);
    const hasGenome = this.config.genome !== null ? true : false;

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
                    disabled={!hasGenome}
                    innerDivStyle={{opacity: hasGenome ? 'inherit' : 0.5}}
                    secondaryText={hasGenome ? 'View table data and sequence data on the genome' : 'No genomic data to browse'}
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={hasGenome ?
                      (e) => this.handleOpen(e,
                        <GenomeBrowserWithActions/>
                      )
                      : () => null
                    }
                    />
          <ListItem primaryText="Table Plotter"
                    disabled={!hasShowableTables}
                    innerDivStyle={{opacity: hasShowableTables ? 'inherit' : 0.5}}
                    secondaryText={hasShowableTables ? 'View table data graphically' : 'No table data to plot'}
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart"/></div>}
                    onClick={hasShowableTables ? (e) => this.handleOpen(e, <TablePlotActions />) : () => null}/>
          <ListItem primaryText="Map Composer"
                    disabled={!(hasShowableGeoCoordTables || hasMapLayers)}
                    innerDivStyle={{opacity: (hasShowableGeoCoordTables || hasMapLayers) ? 'inherit' : 0.5}}
                    secondaryText={(hasShowableGeoCoordTables || hasMapLayers) ? 'View data geographically' : 'No geographic data to browse'}
                    leftIcon={<div><Icon fixedWidth={true} name="globe"/></div>}
                    onClick={(hasShowableGeoCoordTables || hasMapLayers) ? (e) => this.handleOpen(e, <MapActions />) : () => null}/>
          <ListItem primaryText="Tree Plotter"
                    disabled={!hasTrees}
                    innerDivStyle={{opacity: hasTrees ? 'inherit' : 0.5}}
                    secondaryText={hasTrees ? 'View a neighbour joining tree' : 'No tree data to plot'}
                    leftIcon={<div><Icon fixedWidth={true} name="tree"/></div>}
                    onClick={hasTrees ? (e) => this.handleOpen(e, <TreeWithActions />) : () => null}/>
      </List>
    );
  }
});

export default ViewList;

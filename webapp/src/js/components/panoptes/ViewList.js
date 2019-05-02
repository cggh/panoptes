import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _some from 'lodash.some';
import _filter from 'lodash.filter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import { List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';
import Icon from 'ui/Icon';
import GenomeBrowserWithActions from 'containers/GenomeBrowserWithActions';

import DatasetManagerActions from 'DatasetManagerActions';
import TablePlotActions from 'TablePlotActions';
import MapActions from 'Map/MapActions';
import TreeWithActions from 'containers/TreeWithActions';

let ViewList = createReactClass({
  displayName: 'ViewList',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    style: PropTypes.object,
    onClick: PropTypes.func
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
        <ListSubheader>Open a view:</ListSubheader>
        {this.config.user.isManager ?
          <ListItem
            button
            onClick={(e) => this.handleOpen(e, <DatasetManagerActions />)}
          >
            <ListItemIcon>
              <Icon fixedWidth={true} name="database" />
            </ListItemIcon>
            <ListItemText
              primary="Dataset Manager"
              secondary="Import and configure datasets"
            />
          </ListItem>
          : null}
        <ListItem
          button
          onClick={hasGenome ? (e) => this.handleOpen(e, <GenomeBrowserWithActions/>) : () => null}
          disabled={!hasGenome}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="bitmap:genomebrowser.png" />
          </ListItemIcon>
          <ListItemText
            primary="Genome Browser"
            secondary={hasGenome ? 'View table data and sequence data on the genome' : 'No genomic data to browse'}
          />
        </ListItem>
        <ListItem
          button
          onClick={hasShowableTables ? (e) => this.handleOpen(e, <TablePlotActions />) : () => null}
          disabled={!hasShowableTables}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="chart-area" />
          </ListItemIcon>
          <ListItemText
            primary="Table Plotter"
            secondary={hasShowableTables ? 'View table data graphically' : 'No table data to plot'}
          />
        </ListItem>
        <ListItem
          button
          onClick={(hasShowableGeoCoordTables || hasMapLayers) ? (e) => this.handleOpen(e, <MapActions />) : () => null}
          disabled={!(hasShowableGeoCoordTables || hasMapLayers)}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="globe" />
          </ListItemIcon>
          <ListItemText
            primary="Map Composer"
            secondary={(hasShowableGeoCoordTables || hasMapLayers) ? 'View data geographically' : 'No geographic data to browse'}
          />
        </ListItem>
        <ListItem
          button
          onClick={hasTrees ? (e) => this.handleOpen(e, <TreeWithActions />) : () => null}
          disabled={!hasTrees}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="tree" />
          </ListItemIcon>
          <ListItemText
            primary="Tree Plotter"
            secondary={hasTrees ? 'View a neighbour joining tree' : 'No tree data to plot'}
          />
        </ListItem>
      </List>
    );
  },
});

export default ViewList;

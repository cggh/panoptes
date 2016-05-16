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

    let datasetManagerListItem = null;
    if (this.config.isManager) {
      datasetManagerListItem = (
        <ListItem primaryText="Dataset Manager"
                  secondaryText="Import and configure datasets"
                  leftIcon={<div><Icon fixedWidth={true} name="database"/></div>}
                  onClick={(e) => this.handleOpen(e, 'DatasetManager/Actions', {})} />
      );
    }

    return (
        <List style={this.props.style}>
          <Subheader>Open a view:</Subheader>
          {datasetManagerListItem}
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
          <ListItem primaryText="Tree"
                    secondaryText="View a tree"
                    leftIcon={<div><Icon fixedWidth={true} name="tree"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/TreeWithActions', {})} />
        </List>
    );
  }
});

module.exports = ViewList;

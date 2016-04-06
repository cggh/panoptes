import _keys from 'lodash/keys';
import _map from 'lodash/map';
import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';
import Subheader from 'material-ui/lib/Subheader';
import Icon from 'ui/Icon';

let EmptyTab = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired
  },

  icon() {
    return 'folder-o';
  },
  title() {
    return 'New tab';
  },

  handleOpen(e, container, props) {
    let actions = this.getFlux().actions.session;
    if (e.button == 1 || e.metaKey || e.ctrlKey)
      actions.tabOpen(container, props, false);
    else {
      this.props.componentUpdate(props, container);
    }
  },

  handleTableClick(e, table) {
    if (this.config.tables[table.id].settings.listView) {
      this.handleOpen(e, 'containers/ListWithActions', {table: table.id});
    } else {
      this.handleOpen(e, 'containers/DataTableWithActions', {table: table.id});
    }
  },

  render() {
    let {tables, chromosomes} = this.config;
    return (
      <div className="horizontal stack start-align wrap">
        <List style={{width: '500px'}}>
          <Subheader>Open a view:</Subheader>
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/GenomeBrowserWithActions', {chromosome: _keys(chromosomes)[0]})} />
        </List>
        <List style={{width: '500px'}}>
          <Subheader>Open a table:</Subheader>
          {_map(tables, (table) => (
            <ListItem key={table.id}
                      primaryText={table.tableCapNamePlural}
                      secondaryText={table.description}
                      leftIcon={<div><Icon fixedWidth={true} name={table.icon}/></div>}
                      onClick={(e) => this.handleTableClick(e, table)} />
          ))}
        </List>
      </div>
    );
  }
});

module.exports = EmptyTab;

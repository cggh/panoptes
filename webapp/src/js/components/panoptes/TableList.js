import React from 'react';
import _map from 'lodash/map';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Icon from 'ui/Icon';

let TableList = React.createClass({
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

  handleTableClick(e, table) {
    if (this.config.tablesById[table.id].listView) {
      this.handleOpen(e, 'containers/ListWithActions', {table: table.id});
    } else {
      this.handleOpen(e, 'containers/DataTableWithActions', {table: table.id});
    }
  },

  render() {
    let {tables} = this.config;
    return (
      <List style={this.props.style}>
        <Subheader>Open a table:</Subheader>
        {_map(tables, (table) => (
          this.config.tablesById[table.id].isHidden ? null :
          <ListItem key={table.id}
                    primaryText={table.capNamePlural}
                    secondaryText={table.description}
                    leftIcon={<div><Icon fixedWidth={true} name={table.icon}/></div>}
                    onClick={(e) => this.handleTableClick(e, table)} />
        ))}
      </List>

    );
  }
});

module.exports = TableList;

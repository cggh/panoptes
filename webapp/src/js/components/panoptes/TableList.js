import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _map from 'lodash.map';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';
import Icon from 'ui/Icon';
import striptags from 'striptags';
import ListWithActions from 'containers/ListWithActions';
import DataTableWithActions from 'containers/DataTableWithActions';

let TableList = createReactClass({
  displayName: 'TableList',

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

  handleTableClick(e, table) {
    if (this.config.tablesById[table.id].listView) {
      this.handleOpen(e, <ListWithActions table={table.id} />);
    } else {
      this.handleOpen(e, <DataTableWithActions table={table.id} />);
    }
  },

  render() {
    let {tables} = this.config;
    return (
      <List style={this.props.style}>
        <ListSubheader>Open a table:</ListSubheader>
        {_map(tables, (table) => (
          this.config.tablesById[table.id].isHidden ? null :
            <ListItem
              button
              key={table.id}
              onClick={(e) => this.handleTableClick(e, table)}
            >
              <ListItemIcon>
                <Icon fixedWidth={true} name={table.icon}/>
              </ListItemIcon>
              <ListItemText
                primary={table.capNamePlural}
                secondary={striptags(table.description)}
              />
            </ListItem>
        ))}
      </List>

    );
  },
});

export default TableList;

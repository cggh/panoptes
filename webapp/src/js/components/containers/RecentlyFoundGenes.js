import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _map from 'lodash.map';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';


import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';
import Icon from 'ui/Icon';

let RecentlyFoundGenes = createReactClass({
  displayName: 'RecentlyFoundGenes',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('SessionStore')
  ],

  propTypes: {
    onSelect: PropTypes.func,
    subheaderText: PropTypes.string
  },

  getStateFromFlux() {
    return {
      foundGenes: this.getFlux().store('SessionStore').getState().get('foundGenes')
    };
  },

  getInitialState() {
    return null;
  },

  render() {
    let {onSelect, subheaderText} = this.props;
    let {foundGenes} = this.state;

    let foundGenesList = null;

    if (foundGenes.size > 0) {
      let foundGenesListItems = _map(foundGenes.toJS(), ({geneId, geneDesc}) =>
        <ListItem
          button
          key={geneId}
          onClick={(e) => onSelect(e, geneId, geneDesc)}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="bitmap:genomebrowser.png" />
          </ListItemIcon>
          <ListItemText
            primary={geneId}
            secondary={geneDesc}
          />
        </ListItem>
      );

      let subheader = undefined;
      if (subheaderText !== undefined) {
        subheader = <ListSubheader>{subheaderText}</ListSubheader>;
      }

      foundGenesList = (
        <List>
          {subheader}
          {foundGenesListItems}
        </List>
      );

    } else {
      foundGenesList = (
        <List>
          <ListSubheader>No recently found genes.</ListSubheader>
        </List>
      );
    }
    return foundGenesList;
  },
});

export default RecentlyFoundGenes;

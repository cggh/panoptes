import PropTypes from 'prop-types';
import React from 'react';
import _map from 'lodash.map';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';

// UI
import Icon from 'ui/Icon';

let RecentlyFoundGenes = React.createClass({
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
          <ListItem key={geneId}
                    primaryText={geneId}
                    secondaryText={geneDesc}
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                    onClick={(e) => onSelect(e, geneId, geneDesc)}
          />
      );

      let subheader = undefined;
      if (subheaderText !== undefined) {
        subheader = <Subheader>{subheaderText}</Subheader>;
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
          <Subheader>No recently found genes.</Subheader>
        </List>
      );
    }
    return foundGenesList;
  }
});

export default RecentlyFoundGenes;

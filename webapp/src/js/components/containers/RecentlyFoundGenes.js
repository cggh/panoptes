import React from 'react';

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
    setProps: React.PropTypes.func
  },


  handleSelectGene(e, geneId) {

    let container = 'containers/Gene';
    let props = {geneId: geneId};

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (middleClick) {
      this.getFlux().actions.session.popupOpen(container, props, false);
    } else {
      this.props.setProps(props, container);
    }

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
    let {foundGenes} = this.state;

    let foundGenesList = null;

    if (foundGenes.size > 0) {

      let foundGenesListItems = [];

      foundGenes.map( (foundGene) => {

        let foundGenesListItem = (
          <ListItem key={foundGene}
                    primaryText={foundGene}
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                    onClick={(e) => this.handleSelectGene(e, foundGene)}
          />
        );

        foundGenesListItems.push(foundGenesListItem);

      });

      foundGenesList = (
        <List>
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

module.exports = RecentlyFoundGenes;

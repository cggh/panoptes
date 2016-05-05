import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';

// UI
import Icon from 'ui/Icon';

let RecentlyFoundGenes = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  title() {
    return this.props.title;
  },

  handleSelectGene(e, geneId) {

    // Add selected geneId to list of recently found genes.
    this.getFlux().actions.session.geneFound(geneId);

    let container = 'containers/Gene';
    let props = {geneId: geneId};

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (middleClick) {
      this.getFlux().actions.session.popupOpen(container, props, false);
    } else {
      this.props.componentUpdate(props, container);
    }

  },

  render() {

    // Retrieve the list of recently found genes from the session.
    let {foundGenes} = this.getFlux().store('SessionStore').getState().toObject();

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

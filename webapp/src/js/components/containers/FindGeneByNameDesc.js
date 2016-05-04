import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import GeneSearchResultsList from 'panoptes/GeneSearchResultsList';

// Material UI
import TextField from 'material-ui/TextField';


let FindGeneByNameDesc = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  title() {
    return this.props.title;
  },

  getInitialState() {
    return {
      search: ''
    };
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
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

    let {search} = this.state;

    let geneList = null;

    if (search.length <= 2) {

      geneList = (
        <p>Enter more than 2 characters.</p>
      );

    } else {

      geneList = (
        <GeneSearchResultsList
           search={search}
           onSelectGene={this.handleSelectGene}
           icon="bitmap:genomebrowser.png"
          />
      );

    }

    return (
      <div className="stack vertical" style={{padding: '10px'}}>
        <div className="search">
          <TextField ref="search"
                     fullWidth={true}
                     floatingLabelText="Search"
                     value={search}
                     onChange={this.handleSearchChange}
          />
        </div>
        <div>
          {geneList}
        </div>
      </div>
    );

  }
});

module.exports = FindGeneByNameDesc;

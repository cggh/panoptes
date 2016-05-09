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

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    search: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      search: ''
    };
  },

  title() {
    return this.props.title;
  },

  handleSearchChange(event) {
    this.props.componentUpdate({search: event.target.value});
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

    let {search} = this.props;

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
      <div style={{padding: '10px'}}>
        <div className="search">
          <TextField fullWidth={true}
                     floatingLabelText="Search"
                     value={search}
                     onChange={this.handleSearchChange}
          />
        </div>
        <div style={{position: 'relative', width: '100%', height: '200px'}}>
          {geneList}
        </div>
      </div>
    );

  }
});

module.exports = FindGeneByNameDesc;

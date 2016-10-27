import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';

// Panoptes
import GeneSearchResultsList from 'panoptes/GeneSearchResultsList';

// Material UI
import TextField from 'material-ui/TextField';


let FindGeneByNameDesc = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    search: React.PropTypes.string,
    onSelect: React.PropTypes.func
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
    this.props.setProps({search: event.target.value});
  },

  render() {

    let {search, onSelect} = this.props;

    let geneList = null;

    if (search.length <= 2) {

      geneList = (
        <p>Enter more than 2 characters.</p>
      );

    } else {

      geneList = (
        <GeneSearchResultsList
           search={search}
           onSelectGene={onSelect}
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
        {geneList}
      </div>
    );

  }
});

module.exports = FindGeneByNameDesc;

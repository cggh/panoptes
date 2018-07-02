import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';

// Panoptes
import GeneSearchResultsList from 'panoptes/GeneSearchResultsList';

// Material UI
import TextField from '@material-ui/core/TextField';


let FindGeneByNameDesc = createReactClass({
  displayName: 'FindGeneByNameDesc',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    search: PropTypes.string,
    onSelect: PropTypes.func
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
          <TextField autoFocus
            fullWidth={true}
            label="Search"
            value={search}
            onChange={this.handleSearchChange}
          />
        </div>
        {geneList}
      </div>
    );

  },
});

export default FindGeneByNameDesc;

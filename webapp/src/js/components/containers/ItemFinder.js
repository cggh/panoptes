import React from 'react';

// Lodash
import _map from 'lodash/map';
import _filter from 'lodash/filter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import TextField from 'material-ui/TextField';

import Icon from 'ui/Icon';

// Panoptes
import DataTableView from 'panoptes/DataTableView';
import API from 'panoptes/API';

let GeneFinder = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired
  },


  getDefaultProps() {
    return {
      title: 'Find item'
    };
  },

  getInitialState() {
    return {
      search: ''
    };
  },

  icon() {
    return this.props.icon;
  },

  title() {
    return this.props.title;
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  render() {

    let {search} = this.state;
    let {table} = this.props;

    if (this.config.tables[table].settings.isHidden) return (<div>hidden</div>);


    let quickFindFieldsText = '';

    for (let i = 0, len = this.config.tables[table].quickFindFields.length; i < len; i++) {

      let quickFindField = this.config.tables[table].quickFindFields[i];

      if (i == 0) quickFindFieldsText += 'in ';
      if (i != 0) quickFindFieldsText += ', ';
      quickFindFieldsText += this.config.tables[table].propertiesMap[quickFindField].name;

    }


    //let columns = this.config.tables[table];
console.log('this.config.tables[table].propertiesMap: %o', this.config.tables[table].propertiesMap);
console.log('Object.keys(this.config.tables[table].propertiesMap): %o', Object.keys(this.config.tables[table].propertiesMap));

    let filteredProps = _filter(this.config.tables[table].propertiesMap, {settings: {ShowInTable: true}});
console.log('filteredProps: %o', filteredProps);
console.log('Object.keys(filteredProps): %o', Object.keys(filteredProps));

    return (
      <div>
        <div className="search">
          <TextField fullWidth={true}
                     floatingLabelText="Search"
                     value={search}
                     onChange={this.handleSearchChange}
          />
        </div>
        <div>{quickFindFieldsText}</div>
        <div>You searched for {search}</div>
        <div>
          <DataTableView table={table} />
        </div>
      </div>
    );
  }
});

module.exports = GeneFinder;

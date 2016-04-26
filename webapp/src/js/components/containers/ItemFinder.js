import React from 'react';
import Immutable from 'immutable';

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
//import DataTableView from 'panoptes/DataTableView';
import DataTableWithActions from 'containers/DataTableWithActions';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';

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

  handleShowableRowsCountChange(showableRowsCount) {
    this.setState({showableRowsCount: showableRowsCount});
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

    let showablePropertiesMap = {};
    let tableConfig = this.config.tables[table];
    Object.keys(tableConfig.propertiesMap).forEach(
      (key) => {
        if (tableConfig.propertiesMap[key].showInTable) {
          showablePropertiesMap[key] = tableConfig.propertiesMap[key];
        }
      }
    );

console.log('showablePropertiesMap: %o', showablePropertiesMap);

    let columns = Immutable.fromJS(Object.keys(showablePropertiesMap));

    return (
      <div className="vertical stack" style={{padding: '10px'}}>
        <div className="search">
          <TextField fullWidth={true}
                     floatingLabelText="Search"
                     value={search}
                     onChange={this.handleSearchChange}
          />
        </div>
        <div>{quickFindFieldsText}</div>
        <div>You searched for {search}</div>
        <div className="grow" style={{height: '200px', width: '400px'}}>
          <DataTableWithActions table={table}
                         columns={columns}
                         query={SQL.NullQuery}
                         order={null}
                         ascending={true}
                         columnWidths={Immutable.Map()}
                         initialStartRowIndex={0}
                         sidebar={true}
                         onShowableRowsCountChange={this.handleShowableRowsCountChange}
          />
        </div>
      </div>
    );
  }
});

module.exports = GeneFinder;

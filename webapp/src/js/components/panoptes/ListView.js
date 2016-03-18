import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Highlight from 'react-highlighter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';

// Utils
import LRUCache from 'util/LRUCache';

// Material UI components
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let ListView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columns', 'order', 'ascending')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    initialSelectedIndex: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      initialSelectedIndex: 0
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      search: '',
      selectedIndex: this.props.initialSelectedIndex,
      selectedPrimKey: null
    };
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, query, columns, order, ascending, initialSelectedIndex} = props;
    let tableConfig = this.config.tables[table];
    let columnspec = {};
    columns.map((column) => columnspec[column] = tableConfig.propertiesMap[column].defaultDisplayEncoding);

    if (props.columns.size > 0) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec,
        order: order,
        ascending: ascending,
        query: query,
        start: 0
      };
      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'pageQuery' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState({
            loadStatus: 'loaded',
            rows: data,
            selectedPrimKey: data[initialSelectedIndex][tableConfig.primkey]
          });
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState({rows: []});
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.props.onSelect && prevState.selectedPrimKey !== this.state.selectedPrimKey)
      this.props.onSelect(this.state.selectedPrimKey, this.state.selectedIndex);
  },

  handleSelect(primKey, rowIndex) {
    this.props.onSelect(primKey, rowIndex);
  },

  render() {
    let {icon} = this.props;
    let {loadStatus, rows, search} = this.state;

    let tableConfig = this.config.tables[this.props.table];
    if (!tableConfig) {
      console.error(`Error: table ${this.props.table} has no associated config.`);
      return null;
    }

    if (rows.length > 0) {

      let listItems = [];

      rows.map((row, rowIndex) => {

        let primKey = row[tableConfig.primkey];

        let listItem = (
            <ListItem key={rowIndex}
                      primaryText={<div><Highlight search={search}>{primKey}</Highlight></div>}
                      onClick={() => this.handleSelect(primKey, rowIndex)}
                      leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
            />
        );

        listItems.push(listItem);

      });


      return (
        <div>
          <List>
            {listItems}
          </List>
          <Loading status={loadStatus}/>
        </div>
      );

    } else {
      return (
        <div>
          <Loading status="custom">No rows</Loading>
        </div>
      );
    }
  }

});

module.exports = ListView;

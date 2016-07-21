import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import Color from 'color';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import {Table, Column} from 'fixed-data-table';
import 'fixed-data-table/dist/fixed-data-table.css';

// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PropertyCell from 'panoptes/PropertyCell';
import PropertyHeader from 'panoptes/PropertyHeader';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';
import DetectResize from 'utils/DetectResize';

// Constants in this component
const MAX_COLOR = Color('#44aafb');
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 50;
const SCROLLBAR_HEIGHT = 15;

let DataTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columnProperty', 'rowProperty')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    columnProperty: React.PropTypes.string,
    rowProperty: React.PropTypes.string,

  },


  getDefaultProps() {
    return {
      query: SQL.nullQuery,
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
    };
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, query, columnProperty, rowProperty} = props;
    let tableConfig = this.config.tablesById[table];
    let columnspec = {
      'count(*)': 'IN'  //Possible encoding values are at ConfigStore:265
    };
    let groupby = [];
    if (columnProperty) {
      columnspec[columnProperty] = tableConfig.propertiesById[columnProperty].defaultDisplayEncoding;
      groupby.push(columnProperty);
    }
    if (rowProperty) {
      columnspec[rowProperty] = tableConfig.propertiesById[rowProperty].defaultDisplayEncoding;
      groupby.push(rowProperty);
    }
    this.setState({loadStatus: 'loading'});

    let pageQueryAPIargs = {
      database: this.config.dataset,
      table: tableConfig.fetchTableName,
      columns: columnspec,
      query: query,
      groupby
    };

    requestContext.request((componentCancellation) =>
        LRUCache.get(
          'pageQuery' + JSON.stringify(pageQueryAPIargs),
          (cacheCancellation) =>
            API.pageQuery({cancellation: cacheCancellation, ...pageQueryAPIargs}),
          componentCancellation
        ),
    )
    .then((rows) => {
      this.setState({
        loadStatus: 'loaded',
        rows: rows,
      });
    })
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    // .catch((xhr) => {
    //   ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
    //   this.setState({loadStatus: 'error'});
    // });
    .done()
  },

  handleResize(size) {
    this.setState(size);
  },

  render() {
    let {className, columnProperty, rowProperty} = this.props;
    let {loadStatus, rows, width, height} = this.state;
    let tableConfig = this.config.tablesById[this.props.table];
    if (!tableConfig) {
      console.log(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    return <div>{JSON.stringify(rows)}</div>;

  }

});

module.exports = DataTableView;

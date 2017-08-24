import React from 'react';

import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _reduce from 'lodash.reduce';
import _pickBy from 'lodash.pickby';

import Plot from 'Plot';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';
import Loading from 'ui/Loading';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import ErrorReport from 'panoptes/ErrorReporter';
import {allDimensions} from 'panoptes/plotTypes';
import {propertyColour} from 'util/Colours';
import Formatter from 'panoptes/Formatter';
import queryToString from 'util/queryToString';

import 'plot.scss';

let TablePlot = React.createClass({

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin.apply(this, ['table', 'query', 'randomSubsetSize'].concat(allDimensions))
  ],

  // ['table', 'query'].concat(_map(allDimensions, (dim) => 'dimensionProperties.' + dim))

  // NB: For template API, TablePlot also supports individual dimension props.
  // E.g. either dimensionProperties={horizontal: 'chromosome'} or horizontal="chromosome"
  propTypes: {
    plotType: React.PropTypes.string,
    setProps: React.PropTypes.func,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {}),
    randomSubsetSize: React.PropTypes.number,
    displayModeBar: React.PropTypes.bool
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      randomSubsetSize: 20000 //To avoid fetching all by default
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      dimensionData: {},
      dimensionMetadata: {}
    };
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    const {table, query, randomSubsetSize} = props;
    const dimensionProperties = _pickBy(props, (value, name) => allDimensions.indexOf(name) !== -1);
    const tableConfig = this.config.tablesById[table];

    // Get a list of all the recognised dimension names, e.g. horizontal, that:
    // - have been provided as props; and
    // - have a value, e.g. "Chromosome", that is a recognised property of the table.
    const validDimensionNames = _filter(allDimensions, (dim) => dimensionProperties[dim] && tableConfig.propertiesById[dimensionProperties[dim]]);

    // Get a list of all the values, e.g. "Chromosome", for all the valid dimension names.
    const columns = _map(validDimensionNames, (validDimensionName) => dimensionProperties[validDimensionName]);


    if (columns.length > 0) {

      this.setState({loadStatus: 'loading'});

      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.id,
        columns: columns,
        query: this.getDefinedQuery(query, table),
        transpose: false
      };

      if (randomSubsetSize !== undefined) {
        APIargs.randomSample = randomSubsetSize;
      }

      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'query' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {

          let dimensionData = {};
          let dimensionMetadata = {};
          for (let dimensionProperty in dimensionProperties) {
            // NB: When a dimensionProperty has been deselected,
            // its value will be null here.
            if (dimensionProperties[dimensionProperty] !== null) {
              // Decide which properties of the dimensionProperty to pass forward as metadata.
              // TODO: just pass all properties, i.e. the object?
              let {id, colour, description, name, isCategorical, isNumerical} = this.tableConfig().propertiesById[dimensionProperties[dimensionProperty]];
              let colourFunction = propertyColour(this.config.tablesById[table].propertiesById[dimensionProperties[dimensionProperty]]);
              let formatterFunction = (value) => Formatter(this.tableConfig().propertiesById[dimensionProperties[dimensionProperty]], value);
              dimensionData[dimensionProperty] = data[dimensionProperties[dimensionProperty]];
              dimensionMetadata[dimensionProperty] = {id, colour, description, name, isCategorical, isNumerical, colourFunction, formatterFunction};
            }
          }

          this.setState({
            dimensionData,
            dimensionMetadata,
            loadStatus: 'loaded'
          });

        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });

    } else {

      this.setState({
        dimensionData: {},
        dimensionMetadata: {},
        loadStatus: 'loaded'
      });

    }
  },

  render() {
    const {plotType, table, displayModeBar} = this.props;
    const query = queryToString({
      query: this.getDefinedQuery(),
      properties: this.config.tablesById[table].properties
    });
    const title = this.tableConfig().capNamePlural + (this.getDefinedQuery() !== SQL.nullQuery ? ' where ' + query : '');

    return (
      <div className="plot-container">
        {
          plotType ?
          <Plot
            className="plot"
            plotType={plotType}
            dimensionData={this.state.dimensionData}
            dimensionMetadata={this.state.dimensionMetadata}
            title={title}
            displayModeBar={displayModeBar}
          />
          : null
        }
        <Loading status={this.state.loadStatus} />
      </div>);
  }
});

export default TablePlot;

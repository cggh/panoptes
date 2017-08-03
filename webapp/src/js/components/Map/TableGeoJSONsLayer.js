import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isEmpty from 'lodash/isEmpty';

// Panoptes
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import {propertyColour} from 'util/Colours';
import ColourPropertyLegend from 'panoptes/ColourPropertyLegend';
import MapControlComponent from 'Map/MapControlComponent';
import GeoJSON from 'GeoJSON';


const DEFAULT_GEOJSON_FILL_COLOUR = '#3d8bd5';

let TableGeoJSONsLayer = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'colourProperty', 'geoJsonProperty', 'labelProperty')
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    changeLayerStatus: React.PropTypes.func
  },
  propTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    query: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    colourProperty: React.PropTypes.string,
    geoJsonProperty: React.PropTypes.string.isRequired,
    labelProperty: React.PropTypes.string
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  getInitialState() {
    return {
      geoJSONs: []
    };
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    let {table, query, colourProperty, geoJsonProperty, labelProperty} = props;
    let {changeLayerStatus} = this.context;

    changeLayerStatus({loadStatus: 'loading'});

    let tableConfig = this.config.tablesById[table];
    if (tableConfig === undefined) {
      console.error('tableConfig === undefined');
      return null;
    }

    // Collect the set of columns to fetch.
    let fetchColumns = new Set();
    fetchColumns.add(tableConfig.primKey);

    if (geoJsonProperty !== undefined && typeof geoJsonProperty === 'string' && geoJsonProperty !== '') {
      if (tableConfig.propertiesById[geoJsonProperty] === undefined) {
        console.error('The specified geoJsonProperty field ' + geoJsonProperty + ' was not found in the table ' + table);
      } else {
        fetchColumns.add(geoJsonProperty);
      }
    }

    if (colourProperty !== undefined && typeof colourProperty === 'string' && colourProperty !== '') {
      if (tableConfig.propertiesById[colourProperty] === undefined) {
        console.error('The specified colourProperty field ' + colourProperty + ' was not found in the table ' + table);
      } else {
        fetchColumns.add(colourProperty);
      }
    }

    if (labelProperty !== undefined && typeof labelProperty === 'string' && labelProperty !== '') {
      if (tableConfig.propertiesById[labelProperty] === undefined) {
        console.error('The specified labelProperty field ' + labelProperty + ' was not found in the table ' + table);
      } else {
        fetchColumns.add(labelProperty);
      }
    }

    requestContext.request(
      (componentCancellation) => {

        // Get all GeoJSONs using the specified table.
        let APIargs = {
          columns: Array.from(fetchColumns),
          database: this.config.dataset,
          query: this.getDefinedQuery(query, table),
          table: tableConfig.id,
          transpose: true
        };

        return LRUCache.get(
          'query' + JSON.stringify(APIargs), (cacheCancellation) =>
            API.query({
              cancellation: cacheCancellation,
              ...APIargs
            }),
          componentCancellation
        );

      })
      .then((data) => {

        let geoJSONs = [];

        // Translate the fetched data into GeoJSONs.

        let tableConfig = this.config.tablesById[table];
        let primKeyProperty = tableConfig.primKey;

        for (let i = 0; i < data.length; i++) {

          let primKey = data[i][primKeyProperty];

          let valueAsColour = DEFAULT_GEOJSON_FILL_COLOUR;
          let value = undefined;
          if (colourProperty !== undefined && colourProperty !== null) {
            let colourFunction = propertyColour(this.config.tablesById[table].propertiesById[colourProperty]);
            let nullifiedValue = (data[i][colourProperty] === '' ? null : data[i][colourProperty]);
            valueAsColour = colourFunction(nullifiedValue);
            value = nullifiedValue;
          }

          let json = JSON.parse(data[i][geoJsonProperty]);

          let geoJSON = {
            table,
            primKey,
            title: labelProperty !== undefined ? labelProperty : primKey,
            valueAsColour,
            value,
            json
          };

          geoJSONs.push(geoJSON);

        }

        this.setState({geoJSONs});
        changeLayerStatus({loadStatus: 'loaded'});

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        console.error(error);
        changeLayerStatus({loadStatus: 'error'});
      });
  },

  render() {

    let {layerContainer, map} = this.context;
    let {colourProperty, table, labelProperty} = this.props;
    let {geoJSONs} = this.state;

    if (_isEmpty(geoJSONs)) {
      return null;
    }

    return (
      <FeatureGroup
        layerContainer={layerContainer}
        map={map}
      >
        {colourProperty ?
          <MapControlComponent position="bottomleft">
            <ColourPropertyLegend
              colourProperty={colourProperty}
              table={table}
              labelProperty={labelProperty}
            />
          </MapControlComponent>
          : null
        }
        <FeatureGroup>
          {
            geoJSONs.map(
              (geoJSON, i) =>
                <GeoJSON
                  key={'GeoJSON_' + i}
                  json={geoJSON.json}
                  colour={geoJSON.valueAsColour}
                  weight={geoJSON.weight}
                  opacity={geoJSON.opacity}
                />
            )
          }
        </FeatureGroup>
      </FeatureGroup>
    );


  }


});

export default TableGeoJSONsLayer;

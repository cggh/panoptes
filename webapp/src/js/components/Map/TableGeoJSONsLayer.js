import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import _isEmpty from 'lodash.isempty';
import FeatureGroup from 'Map/FeatureGroup';
import SQL from 'panoptes/SQL';
import {propertyColour} from 'util/Colours';
import ColourPropertyLegend from 'panoptes/ColourPropertyLegend';
import MapControlComponent from 'Map/MapControlComponent';
import GeoJSON from 'GeoJSON';
import withAPIData from 'hoc/withAPIData';
import DataItem from 'DataItem';
import DataItemViews from 'panoptes/DataItemViews';
import CalcMapBounds from 'util/CalcMapBounds';

const DEFAULT_GEOJSON_FILL_COLOUR = '#3d8bd5';

let TableGeoJSONsLayer = createReactClass({
  displayName: 'TableGeoJSONsLayer',

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    changeLayerStatus: PropTypes.func
  },

  propTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    query: PropTypes.string,
    table: PropTypes.string.isRequired,
    colourProperty: PropTypes.string,
    geoJsonProperty: PropTypes.string.isRequired,
    labelProperty: PropTypes.string,
    showLegend: PropTypes.bool,
    maxLegendItems: PropTypes.number,
    config: PropTypes.object, // This will be provided via withAPIData
    data: PropTypes.array, // This will be provided via withAPIData
    disableClick: PropTypes.bool
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
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

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      showLegend: true
    };
  },

  render() {

    let {layerContainer, map} = this.context;
    let {colourProperty, table, labelProperty, showLegend, maxLegendItems, disableClick, geoJSONs} = this.props;

    if (_isEmpty(geoJSONs)) {
      return null;
    }
    return (
      <FeatureGroup
        layerContainer={layerContainer}
        map={map}
      >
        {showLegend && colourProperty !== undefined ?
          <MapControlComponent position="bottomleft">
            <ColourPropertyLegend
              colourProperty={colourProperty}
              table={table}
              labelProperty={labelProperty}
              maxLegendItems={maxLegendItems}
            />
          </MapControlComponent>
          : null
        }
        <FeatureGroup>
          {
            geoJSONs.map(
              (geoJSON, i) =>
                <GeoJSON
                  key={`GeoJSON_${i}`}
                  json={geoJSON.json}
                  colour={geoJSON.valueAsColour}
                  weight={geoJSON.weight}
                  opacity={geoJSON.opacity}
                  onClick={disableClick ? () => null : geoJSON.onClick}
                />
            )
          }
        </FeatureGroup>
      </FeatureGroup>
    );


  },
});


TableGeoJSONsLayer = withAPIData(TableGeoJSONsLayer, function({props}) {

  let {table, query, colourProperty, geoJsonProperty, labelProperty} = props;

  query = query ||
    (table  ? config.tablesById[table].defaultQuery : null) ||
    SQL.nullQuery;

  let tableConfig = this.config.tablesById[table];
  if (tableConfig === undefined) {
    console.error('tableConfig === undefined');
    return null;
  }

  // Collect the set of columns to fetch.
  let columns = new Set();
  columns.add(tableConfig.primKey);

  if (geoJsonProperty !== undefined && typeof geoJsonProperty === 'string' && geoJsonProperty !== '') {
    if (tableConfig.propertiesById[geoJsonProperty] === undefined) {
      console.error(`The specified geoJsonProperty field ${geoJsonProperty} was not found in the table ${table}`);
    } else {
      columns.add(geoJsonProperty);
    }
  }

  if (colourProperty !== undefined && typeof colourProperty === 'string' && colourProperty !== '') {
    if (tableConfig.propertiesById[colourProperty] === undefined) {
      console.error(`The specified colourProperty field ${colourProperty} was not found in the table ${table}`);
    } else {
      columns.add(colourProperty);
    }
  }

  if (labelProperty !== undefined && typeof labelProperty === 'string' && labelProperty !== '') {
    if (tableConfig.propertiesById[labelProperty] === undefined) {
      console.error(`The specified labelProperty field ${labelProperty} was not found in the table ${table}`);
    } else {
      columns.add(labelProperty);
    }
  }

  return {
    requests: {
      data: {
        method: 'query',
        args: {
          database: this.config.dataset,
          table,
          columns,
          query,
          transpose: true
        },
      },
    },
    postProcess: function({data}) {
      // Translate the apiData data into GeoJSONs.
      let geoJSONs = [];
      let jsons = [];

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

        let views = DataItemViews.getViews(tableConfig.dataItemViews, tableConfig.hasGeoCoord);
        let onClick = () => this.getFlux().actions.session.popupOpen(<DataItem primKey={primKey} table={table}>{views}</DataItem>);

        if (data[i][geoJsonProperty]) {
          let json = JSON.parse(data[i][geoJsonProperty]);
          let geoJSON = {
            table,
            primKey,
            title: labelProperty !== undefined ? labelProperty : primKey,
            valueAsColour,
            value,
            json,
            onClick
          };
          geoJSONs.push(geoJSON);
          jsons.push(json);
        }
      }

      this.context.changeLayerStatus({loadStatus: 'loaded', bounds: CalcMapBounds.calcMapBoundsFromGeoJsonObjects(jsons)});
      return {geoJSONs};
    }
  };
});

export default TableGeoJSONsLayer;

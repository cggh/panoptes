import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import _isEmpty from 'lodash.isempty';
import _inRange from 'lodash.inrange';
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
import ComponentRegistry from 'util/ComponentRegistry';

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
    min: PropTypes.number, //For legend on continuous properties
    max: PropTypes.number,
    disableClick: PropTypes.bool,
    onClickBehaviour: PropTypes.string,
    onClickComponent: PropTypes.string,
    onClickComponentProps: PropTypes.object,
    geoJSONs: PropTypes.array,
    colour: PropTypes.string, // Overrides DEFAULT_GEOJSON_FILL_COLOUR but not colourProperty
    numberOfBins: PropTypes.number,
    colourRange: PropTypes.array, // Overrides default Colours scaleColours but not propConfig.valueColours
    binTextColour: PropTypes.string,
    noDataColour: PropTypes.string,
    zeroColour: PropTypes.string,
    legendLayout: PropTypes.string,
    legendValueSuffix: PropTypes.string,
    showMaxValueAsMaxColour: PropTypes.bool,
    geoJsonStrokeOpacity: PropTypes.number,
    geoJsonFillOpacity: PropTypes.number,
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
      onClickBehaviour: 'dataItemPopup',
      showLegend: true,
      showMaxValueAsMaxColour: false,
    };
  },

  render() {

    let {layerContainer, map} = this.context;
    let {
      colourProperty, table, labelProperty, showLegend, maxLegendItems,
      disableClick, max, min, numberOfBins, geoJSONs, colourRange, binTextColour,
      noDataColour, zeroColour, legendLayout, legendValueSuffix,
    } = this.props;

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
              max={max}
              min={min}
              numberOfBins={numberOfBins}
              colourRange={colourRange}
              binTextColour={binTextColour}
              noDataColour={noDataColour}
              zeroColour={zeroColour}
              layout={legendLayout}
              valueSuffix={legendValueSuffix}
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
                  fillOpacity={geoJSON.fillOpacity}
                  onClick={disableClick ? () => null : geoJSON.onClick}
                  popup={disableClick ? undefined : geoJSON.popup}
                />
            )
          }
        </FeatureGroup>
      </FeatureGroup>
    );


  },
});


TableGeoJSONsLayer = withAPIData(TableGeoJSONsLayer, function({props}) {

  let {
    table,
    query,
    colourProperty,
    geoJsonProperty,
    labelProperty,
    min,
    max,
    numberOfBins,
    onClickBehaviour,
    onClickComponent,
    onClickComponentProps,
    colour,
    colourRange,
    zeroColour,
    showMaxValueAsMaxColour,
    geoJsonStrokeOpacity,
    geoJsonFillOpacity,
  } = props;

  query = query ||
    (table  ? this.config.tablesById[table].defaultQuery : null) ||
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
          columns: Array.from(columns),
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

      // Prep binValueRanges
      let binValueRanges = undefined;
      if (numberOfBins !== undefined && numberOfBins > 0) {
        binValueRanges = [];
        const binValueWidth = max / numberOfBins;
        const colourFunction = propertyColour(this.config.tablesById[table].propertiesById[colourProperty], min, max, colourRange);
        for (let binMinValueBoundary = min; binMinValueBoundary < max; binMinValueBoundary += binValueWidth) {
          const binMaxValueBoundary = binMinValueBoundary + binValueWidth;
          const binMidValue = binMinValueBoundary + (binValueWidth / 2);
          const midValueAsColour = colourFunction(binMidValue) || colour || DEFAULT_GEOJSON_FILL_COLOUR;
          binValueRanges.push(
            {
              min: binMinValueBoundary,
              max: binMaxValueBoundary,
              midValueAsColour,
            }
          );
        }
      }

      for (let i = 0; i < data.length; i++) {

        let primKey = data[i][primKeyProperty];

        const colourFunction = propertyColour(this.config.tablesById[table].propertiesById[colourProperty], min, max, colourRange);
        let valueAsColour = colour || DEFAULT_GEOJSON_FILL_COLOUR;
        let value = undefined;
        if (colourProperty !== undefined && colourProperty !== null) {
          let nullifiedValue = (data[i][colourProperty] === '' ? null : data[i][colourProperty]);
          if (binValueRanges !== undefined && binValueRanges.length > 0) {
            if (nullifiedValue === max && showMaxValueAsMaxColour) {
              valueAsColour = colourFunction(nullifiedValue) || colour || DEFAULT_GEOJSON_FILL_COLOUR;
            } else if (nullifiedValue === max && !showMaxValueAsMaxColour) {
              valueAsColour = binValueRanges[binValueRanges.length - 1].midValueAsColour;
            } else if (nullifiedValue === 0 && zeroColour !== undefined) {
              valueAsColour = zeroColour;
            } else {
              for (let i = 0, iLength = binValueRanges.length; i < iLength; i++) {
                if (_inRange(nullifiedValue, binValueRanges[i].min, binValueRanges[i].max)) {
                  valueAsColour = binValueRanges[i].midValueAsColour;
                  break;
                }
              }
            }
          } else {
            valueAsColour = colourFunction(nullifiedValue) || colour || DEFAULT_GEOJSON_FILL_COLOUR;
            valueAsColour = nullifiedValue === 0 && zeroColour !== undefined ? zeroColour : valueAsColour;
          }
          value = nullifiedValue;
        }

        let views = DataItemViews.getViews(tableConfig.dataItemViews, tableConfig.hasGeoCoord);
        onClickComponent = ComponentRegistry(onClickComponent) || onClickComponent;
        let onClickComponentMergedProps = {table, primKey, flux: this.flux};
        if (onClickComponentProps) {
          onClickComponentMergedProps = {...onClickComponentProps, ...onClickComponentMergedProps};
        }

        let onClick = onClickBehaviour === 'dataItemPopup' ? () => this.getFlux().actions.session.popupOpen(<DataItem primKey={primKey} table={table}>{views}</DataItem>) : undefined;
        onClick = onClick ||  (onClickBehaviour === 'popup' ? () => this.getFlux().actions.session.popupOpen(React.createElement(onClickComponent, onClickComponentMergedProps)) : undefined);
        let popup = onClickBehaviour === 'tooltip' ?  React.createElement(onClickComponent, onClickComponentMergedProps) : undefined;

        if (data[i][geoJsonProperty]) {
          let json = JSON.parse(data[i][geoJsonProperty]);
          let geoJSON = {
            table,
            primKey,
            title: labelProperty !== undefined ? labelProperty : primKey,
            valueAsColour,
            value,
            json,
            onClick,
            popup,
            opacity: geoJsonStrokeOpacity,
            fillOpacity: geoJsonFillOpacity,
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

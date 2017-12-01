import PropTypes from 'prop-types';
import React from 'react';


import createReactClass from 'create-react-class';
import CustomPopup from 'components/Map/CustomPopup';
import CustomMarker from 'components/Map/CustomMarker';


// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isEmpty from 'lodash.isempty';

import _sum from 'lodash.sum';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _keys from 'lodash.keys';
import _countBy from 'lodash.countby';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'util/CalcMapBounds';
import ComponentMarker from 'Map/ComponentMarker';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import {propertyColour} from 'util/Colours';
import GeoLayouter from 'utils/GeoLayouter';
import Polyline from 'Map/Polyline';
import PieChart from 'PieChart';
import DataTableWithActions from 'containers/DataTableWithActions';
import ListWithActions from 'containers/ListWithActions';
import Histogram from 'Histogram';
import {scaleColour} from 'util/Colours';
import PropertyLegend from 'panoptes/PropertyLegend';
import MapControlComponent from 'Map/MapControlComponent';
import filterChildren from 'util/filterChildren';
import ItemLink from 'panoptes/ItemLink';

const DEFAULT_MARKER_FILL_COLOUR = '#3d8bd5';
const HISTOGRAM_WIDTH_PIXELS = 100;

const ALLOWED_CHILDREN = [
  'CustomPopup',
  'CustomMarker',
];

let TableMarkersLayerCustomPopup = createReactClass({
  displayName: 'TableMarkersLayerCustomPopup',

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('highlight', 'primKey', 'query', 'table', 'markerColourProperty')
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    crs: PropTypes.object,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    changeLayerStatus: PropTypes.func
  },

  propTypes: {
    highlight: PropTypes.string,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    primKey: PropTypes.string, // if not specified then all table records are used
    query: PropTypes.string,
    table: PropTypes.string,
    markerColourProperty: PropTypes.string,
    showLegend: PropTypes.bool,
    maxLegendItems: PropTypes.number,
    disableOnClickMarker: PropTypes.bool,
    clusterMarkers: PropTypes.bool,
    clickTable: PropTypes.string,
    clickPrimaryKeyProperty: PropTypes.string,
    children: PropTypes.node
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    onClickMarker: PropTypes.func
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map,
    };
  },

  getInitialState() {
    return {
      markersGroupedByLocation: {}
    };
  },

  getDefaultProps() {
    return {
      showLegend: true,
      disableOnClickMarker: false,
      clusterMarkers: true
    };
  },

  // Event handlers
  handleClickSingleMarker(e, payload) {
    let {table, primKey} = payload;
    const middleClick = e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey, switchTo: !middleClick});
  },

  handleClickClusterMarker(e, payload) {
    let {table, originalLat, originalLng, latProperty, lngProperty} = payload;
    const middleClick = e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    let switchTo = !middleClick;

    if (this.config.tablesById[table].listView) {
      this.getFlux().actions.session.popupOpen(<ListWithActions table={table}/>, switchTo);
    } else {

      let encodedPopupQuery = undefined;

      let positionQuery = SQL.WhereClause.AND([
        SQL.WhereClause.CompareFixed(latProperty, '=', originalLat),
        SQL.WhereClause.CompareFixed(lngProperty, '=', originalLng)
      ]);

      let baseQueryDecoded = SQL.WhereClause.decode(this.props.query);
      if (baseQueryDecoded.isTrivial) {
        positionQuery.isRoot = true;
        encodedPopupQuery = SQL.WhereClause.encode(positionQuery);
      } else {
        let newAND = SQL.WhereClause.Compound('AND');
        newAND.addComponent(baseQueryDecoded);
        newAND.addComponent(positionQuery);
        newAND.isRoot = true;
        encodedPopupQuery = SQL.WhereClause.encode(newAND);
      }

      this.getFlux().actions.session.popupOpen(<DataTableWithActions key={`${table}_${encodedPopupQuery}`} table={table}
                                                                     query={encodedPopupQuery}/>, switchTo);
    }
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    let {highlight, primKey, table, query, markerColourProperty, clickPrimaryKeyProperty} = props;
    let {changeLayerStatus} = this.context;

    if (table !== this.props.table ||
      markerColourProperty !== this.props.markerColourProperty) {
      this.setState({markersGroupedByLocation: {}});
    }
    changeLayerStatus({loadStatus: 'loading'});

    let tableConfig = this.config.tablesById[table];
    if (tableConfig === undefined) {
      console.error('tableConfig === undefined');
      return null;
    }
    // Check that the table specified for locations has geographic coordinates.
    if (tableConfig.hasGeoCoord === false) {
      console.error('tableConfig.hasGeoCoord === false');
      return null;
    }

    let locationPrimKeyProperty = tableConfig.primKey;

    // TODO: support lngProperty and latProperty props, to specify different geo columns.
    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    // let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    // let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationLongitudeProperty = tableConfig.longitude;
    let locationLatitudeProperty = tableConfig.latitude;

    let locationColumns = new Set();
    locationColumns.add(locationPrimKeyProperty);
    locationColumns.add(locationLongitudeProperty);
    locationColumns.add(locationLatitudeProperty);
    if (clickPrimaryKeyProperty) {
      locationColumns.add(clickPrimaryKeyProperty);
    }

    // If no highlight has been specified, but a primKey has been then convert primKey to a highlight.
    if (highlight === undefined && primKey !== undefined) {
      highlight = `${locationPrimKeyProperty}:${primKey}`;
    }

    // TODO: check highlight looks like "highlightField:highlightValue"
    if (highlight !== undefined && typeof highlight === 'string' && highlight !== '') {
      let [highlightField] = highlight.split(':');
      if (highlightField !== undefined) {
        if (tableConfig.propertiesById[highlightField] === undefined) {
          console.error(`The specified highlight field ${highlightField} was not found in the table ${table}`);
        } else {
          locationColumns.add(highlightField);
        }
      }
    }

    if (markerColourProperty !== undefined && typeof markerColourProperty === 'string' && markerColourProperty !== '') {
      if (tableConfig.propertiesById[markerColourProperty] === undefined) {
        console.error(`The specified markerColourProperty field ${markerColourProperty} was not found in the table ${table}`);
      } else {
        locationColumns.add(markerColourProperty);
      }
    }

    requestContext.request(
      (componentCancellation) => {

        // Get all markers using the specified table.
        let locationAPIargs = {
          columns: Array.from(locationColumns),
          database: this.config.dataset,
          query: this.getDefinedQuery(query, table),
          table: tableConfig.id,
          transpose: true
        };

        return LRUCache.get(
          `query${JSON.stringify(locationAPIargs)}`, (cacheCancellation) =>
            API.query({
              cancellation: cacheCancellation,
              ...locationAPIargs
            }),
          componentCancellation
        );

      })
      .then((data) => {

        let markers = []; // markers[] is only used for CalcMapBounds.calcMapBounds(markers)
        let markersGroupedByLocation = {};

        // Translate the fetched locationData into markers.
        let locationTableConfig = this.config.tablesById[table];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        let highlightField, highlightValue = null;

        // TODO: check highlight looks like "highlightField:highlightValue"
        if (highlight !== undefined && typeof highlight === 'string' && highlight !== '') {
          [highlightField, highlightValue] = highlight.split(':');
        }

        let minValue = undefined;
        let maxValue = undefined;

        for (let i = 0; i < data.length; i++) {

          let locationDataPrimKey = data[i][locationPrimKeyProperty];

          let isHighlighted = false;
          if (highlightField !== null && highlightValue !== null) {
            isHighlighted = (data[i][highlightField] === highlightValue ? true : false);
          }

          let valueAsColour = DEFAULT_MARKER_FILL_COLOUR;
          let value = undefined;
          if (markerColourProperty !== undefined && markerColourProperty !== null) {
            let markerColourFunction = propertyColour(this.config.tablesById[table].propertiesById[markerColourProperty]);
            let nullifiedValue = (data[i][markerColourProperty] === '' ? null : data[i][markerColourProperty]);
            valueAsColour = markerColourFunction(nullifiedValue);
            value = nullifiedValue;
          }

          minValue = (minValue === undefined || value < minValue) ? value : minValue;
          maxValue = (maxValue === undefined || value > maxValue) ? value : maxValue;

          let lat = parseFloat(data[i][locationTableConfig.latitude]);
          let lng = parseFloat(data[i][locationTableConfig.longitude]);

          // Compose a unique key string using the location latLng
          let location = `${data[i][locationTableConfig.latitude]}_${data[i][locationTableConfig.longitude]}`;

          let marker = {
            isHighlighted,
            table,
            lat,
            lng,
            primKey: locationDataPrimKey,
            title: locationDataPrimKey,
            valueAsColour,
            value,
            latProperty: locationTableConfig.latitude,
            lngProperty: locationTableConfig.longitude,
            originalLat: lat,
            originalLng: lng,
            clickPrimKey: data[i][clickPrimaryKeyProperty]
          };

          markers.push({lat, lng}); // markers[] is only used for CalcMapBounds.calcMapBounds(markers)

          if (!(location in markersGroupedByLocation)) {
            markersGroupedByLocation[location] = [];
          }

          markersGroupedByLocation[location].push(marker);
        }

        this.setState({markersGroupedByLocation, minValue, maxValue});
        changeLayerStatus({loadStatus: 'loaded', bounds: CalcMapBounds.calcMapBounds(markers)});

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

    let {crs, layerContainer, map} = this.context;
    let {markerColourProperty, table, showLegend, maxLegendItems, disableOnClickMarker, clusterMarkers, children, clickPrimaryKeyProperty, clickTable} = this.props;

    let {markersGroupedByLocation, minValue, maxValue} = this.state;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    if (_isEmpty(markersGroupedByLocation)) {
      return null;
    }

    let markerColourPropertyIsNumerical = false;
    let markerColourPropertyIsCategorical = false;

    if (markerColourProperty !== undefined && markerColourProperty !== null) {
      markerColourPropertyIsNumerical = this.config.tablesById[table].propertiesById[markerColourProperty].isNumerical;
      markerColourPropertyIsCategorical = this.config.tablesById[table].propertiesById[markerColourProperty].isCategorical;
    }

    let clusteredMarkers = [];
    const uniqueValues = {};

    for (let location in markersGroupedByLocation) {

      let markersAtLocationCount = markersGroupedByLocation[location].length;

      // Group markers by their value.
      let markersGroupedByValue = {};

      for (let i = 0, len = markersGroupedByLocation[location].length; i < len; i++) {
        let value = markersGroupedByLocation[location][i].value;
        uniqueValues[value] = true;
        if (markersGroupedByValue[value] === undefined) {
          markersGroupedByValue[value] = [];
        }
        markersGroupedByValue[value].push(markersGroupedByLocation[location][i]);
      }


      if (markerColourPropertyIsNumerical || (markerColourPropertyIsNumerical && markerColourPropertyIsCategorical)) {

        //// Prepare a histogram

        // Create a chart item (histogram bin) for each unique marker value.
        // NB: all markers that have the same value also have the same valueAsColour.
        let markerChartData = [];
        for (let value in markersGroupedByValue) {
          markerChartData.push({
            value: markersGroupedByValue[value][0].value,
            color: markersGroupedByValue[value][0].valueAsColour
          });
        }

        // NB: The originalRadius is for the GeoLayouter collision detection.
        const histogramRadius = Math.sqrt(2 * Math.pow((HISTOGRAM_WIDTH_PIXELS / 2), 2));

        // NB: The colours associated with the individual values
        // can not be applied to the histogram,
        // at least not to the fillColour of the bins,
        // because each bin represents a range of values.

        clusteredMarkers.push({
          clusterType: 'histogram',
          chartDataTable: table,
          key: location,
          lat: markersGroupedByLocation[location][0].lat,
          lng: markersGroupedByLocation[location][0].lng,
          originalRadius: histogramRadius,
          chartData: markerChartData,
          table,
          primKey: markersGroupedByLocation[location][0].primKey,
          colourScaleFunction: scaleColour([minValue, maxValue]),
          latProperty: markersGroupedByLocation[location][0].latProperty,
          lngProperty: markersGroupedByLocation[location][0].lngProperty,
          originalLat: markersGroupedByLocation[location][0].originalLat,
          originalLng: markersGroupedByLocation[location][0].originalLng,
          markersAtLocationCount
        });

      } else {

        // Includes markerColourPropertyIsCategorical
        // as well as neither isCategorical nor isNumerical

        // NB: This includes that case when a primary key is selected as markerColourProperty.
        // The primary key property (isPrimKey) should not be categorical, if it is to be unique,
        // but showing a pieChart is more visually useful than showing a histogram.

        //// Prepare a pie chart

        // Create a chart item (pie chart sector) for each unique marker value.
        // NB: all markers that have the same value also have the same colour.
        // NB: the key for undefined values is the string "undefined"
        let markerChartData = [];
        for (let value in markersGroupedByValue) {
          uniqueValues[value] = true;

          let name = `${(value !== 'undefined' ? `${value}: ` : '') + markersGroupedByValue[value].length} ${markersGroupedByValue[value].length === 1 ? this.config.tablesById[table].nameSingle : this.config.tablesById[table].namePlural}`;
          if (markerColourPropertyIsNumerical) {
            name = `${markersGroupedByValue[value].length} ${markersGroupedByValue[value].length === 1 ? this.config.tablesById[table].nameSingle : this.config.tablesById[table].namePlural}${value !== 'undefined' ? ` with ${value}` : ''}`;
          }

          markerChartData.push({
            name,
            value: markersGroupedByValue[value].length,
            color: markersGroupedByValue[value][0].valueAsColour
          });
        }

        clusteredMarkers.push({
          clusterType: 'pieChart',
          chartDataTable: table,
          key: location,
          lat: markersGroupedByLocation[location][0].lat,
          lng: markersGroupedByLocation[location][0].lng,
          originalRadius: Math.sqrt(markersGroupedByLocation[location].length),
          chartData: markerChartData,
          table,
          primKey: markersGroupedByLocation[location][0].primKey,
          count: markersGroupedByLocation[location].length,
          latProperty: markersGroupedByLocation[location][0].latProperty,
          lngProperty: markersGroupedByLocation[location][0].lngProperty,
          originalLat: markersGroupedByLocation[location][0].originalLat,
          originalLng: markersGroupedByLocation[location][0].originalLng,
          markersAtLocationCount,
          clickPrimKeyBreakdown: _countBy(markersGroupedByLocation[location], 'clickPrimKey')
        });

      }

    }
    if (clusteredMarkers.length > 0) {

      // NB: Copied from PieChartMarkersLayer
      let size = map.getSize();
      let bounds = map.getBounds();
      let pixelArea = size.x * size.y;
      let pieAreaSum = _sum(_map(
        _filter(clusteredMarkers, (marker) => {
          let {lat, lng} = marker;
          return bounds.contains([lat, lng]);
        }),
        (marker) => marker.originalRadius * marker.originalRadius * 2 * Math.PI)
      );
      let lengthRatio = this.lastLengthRatio || 1;
      if (pieAreaSum > 0) {
        lengthRatio = Math.sqrt(0.05 / (pieAreaSum / pixelArea));
      }
      this.lastLengthRatio = lengthRatio;
      _forEach(clusteredMarkers, (marker) => marker.radius = Math.max(10, marker.originalRadius * lengthRatio));
      return (
        <FeatureGroup
          layerContainer={layerContainer}
          map={map}
        >
          {showLegend ?
            <MapControlComponent position="bottomleft">
              <PropertyLegend
                property={markerColourProperty}
                table={table}
                knownValues={_keys(uniqueValues)}
                maxLegendItems={maxLegendItems}
              />
            </MapControlComponent>
            : null
          }
          {clusterMarkers ?
            <GeoLayouter nodes={clusteredMarkers}>
              {
                (renderNodes) =>
                  <FeatureGroup>
                    {
                      renderNodes.map(
                        (marker, i) => {

                          let clusterComponent = undefined;

                          if (marker.clusterType === 'pieChart') {
                            clusterComponent = (
                              <PieChart
                                chartData={marker.chartData}
                                crs={crs}
                                hideValues={true}
                                lat={marker.lat}
                                lng={marker.lng}
                                originalLat={marker.originalLat}
                                originalLng={marker.originalLng}
                                radius={marker.radius}
                                faceText={marker.count !== undefined ? marker.count : 1}
                                isHighlighted={marker.isHighlighted}
                              />
                            );

                          } else if (marker.clusterType === 'histogram') {

                            const histogramWidth = Math.sqrt(Math.pow(marker.radius, 2) / 2) * 2;

                            clusterComponent = (
                              <Histogram
                                chartData={marker.chartData}
                                width={histogramWidth}
                                height={histogramWidth}
                                radius={marker.radius}
                                lat={marker.lat}
                                lng={marker.lng}
                                originalLat={marker.originalLat}
                                originalLng={marker.originalLng}
                                unitNameSingle={this.config.tablesById[table].nameSingle}
                                unitNamePlural={this.config.tablesById[table].namePlural}
                                valueName={this.config.tablesById[table].propertiesById[markerColourProperty].name}
                                colourScaleFunction={marker.colourScaleFunction}
                                minValue={minValue}
                                maxValue={maxValue}
                                isHighlighted={marker.isHighlighted}
                              />
                            );

                          } else {
                            console.error('Unhandled marker.clusterType: %o', marker.clusterType);
                          }

                          return (
                            <ComponentMarker
                              key={`ComponentMarker_${i}`}
                              position={{lat: marker.lat, lng: marker.lng}}
                              onClick={disableOnClickMarker ? null : (e) => this.handleClickClusterMarker(e, {
                                table: marker.table,
                                originalLat: marker.originalLat,
                                originalLng: marker.originalLng,
                                latProperty: marker.latProperty,
                                lngProperty: marker.lngProperty
                              })}
                              zIndexOffset={0}
                            >
                              {clusterComponent}
                            </ComponentMarker>
                          );


                        }
                      ).concat(
                        renderNodes.map(
                          (marker, i) =>
                            <Polyline
                              className="panoptes-table-markers-layer-polyline"
                              key={`Polyline_${i}`}
                              positions={[[marker.lat, marker.lng], [marker.fixedNode.lat, marker.fixedNode.lng]]}
                            />
                        )
                      )
                    }
                  </FeatureGroup>
              }
            </GeoLayouter>
            :
            <FeatureGroup>
              {
                clusteredMarkers.map(
                  (marker, i) =>
                    <ComponentMarker
                      key={`ComponentMarker_${i}`}
                      position={{lat: marker.lat, lng: marker.lng}}
                      onClick={disableOnClickMarker || clickPrimaryKeyProperty ? null : (e) => this.handleClickSingleMarker(e, {
                        table: marker.table,
                        primKey: marker.primKey
                      })}
                      zIndexOffset={0}
                      popup={
                        <span>
                          {_map(marker.clickPrimKeyBreakdown, (val, key) => {
                            return React.Children.map(children, (child) => child.type === CustomPopup ? React.cloneElement(child, {primKey: key}) : null);
                          })}
                        </span>
                      }
                    >
                      {React.Children.map(children, (child) => child.type === CustomMarker ? child : null)}
                    </ComponentMarker>
                )
              }
            </FeatureGroup>
          }
        </FeatureGroup>
      );
    } else {
      return null;
    }

  },
});

export default TableMarkersLayerCustomPopup;

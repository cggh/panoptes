import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

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
import _clone from 'lodash.clone';

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
import ItemTemplate from 'panoptes/ItemTemplate';
import Template from 'Template';

const DEFAULT_MARKER_FILL_COLOUR = '#3d8bd5';
const HISTOGRAM_WIDTH_PIXELS = 100;

const ALLOWED_CHILDREN = [
  'svg'
];

let TableMarkersLayer = createReactClass({
  displayName: 'TableMarkersLayer',

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('highlight', 'primKey', 'query', 'table', 'markerColourProperty', 'onClickComponentTemplateDocPath')
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
    children: PropTypes.node,
    onClickSingleBehaviour: PropTypes.string,
    onClickSingleComponent: PropTypes.string,
    onClickSingleComponentProps: PropTypes.object,
    onClickSingleComponentTemplateDocPath: PropTypes.string,
    onClickClusterBehaviour: PropTypes.string,
    onClickClusterComponent: PropTypes.string,
    onClickClusterComponentProps: PropTypes.object,
    onClickClusterComponentTemplateDocPath: PropTypes.string,
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
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
      clusterMarkers: true,
      onClickSingleBehaviour: 'dataItemPopup',
      onClickClusterBehaviour: 'popup',
    };
  },

  // Event handlers
  handleClickSingleMarker(e, onClickSingleProps, onClickSingleReactElement) {

    const {onClickSingleBehaviour} = this.props;

    if (onClickSingleBehaviour === 'tooltip') {
      // tooltips are handled inline.
      console.error('Tried to handle a tooltip onClick via handleClickSingleMarker');
      return;
    }

    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    const switchTo = !middleClick;

    if (onClickSingleBehaviour === 'dataItemPopup') {
      this.getFlux().actions.panoptes.dataItemPopup({table: onClickSingleProps.table, primKey: onClickSingleProps.primKey, switchTo});
    } else if (onClickSingleBehaviour === 'tab') {
      this.getFlux().actions.session.tabOpen(onClickSingleReactElement, switchTo);
    } else {
      console.error('Unhandled onClickSingleBehaviour: ', onClickSingleBehaviour);
    }
  },

  handleClickClusterMarker(e, onClickClusterReactElement) {

    const {onClickClusterBehaviour} = this.props;

    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    const switchTo = !middleClick;

    if (onClickClusterBehaviour === 'popup') {
      this.getFlux().actions.session.popupOpen(onClickClusterReactElement, switchTo);
    } else if (onClickClusterBehaviour === 'tab') {
      this.getFlux().actions.session.tabOpen(onClickClusterReactElement, switchTo);
    } else {
      console.error('Unhandled onClickClusterBehaviour: ', onClickClusterBehaviour);
    }
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    let {
      highlight, primKey, table, query, markerColourProperty,
      clickPrimaryKeyProperty, onClickSingleComponentTemplateDocPath,
      onClickClusterComponentTemplateDocPath
    } = props;
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

    // Get all markers using the specified table.
    let locationAPIargs = {
      columns: Array.from(locationColumns),
      database: this.config.dataset,
      query: this.getDefinedQuery(query, table),
      table: tableConfig.id,
      transpose: true
    };

    let onClickSingleTemplateAPIargs = {
      url: `/panoptes/Docs/${this.config.dataset}/${onClickSingleComponentTemplateDocPath}`
    };

    let onClickClusterTemplateAPIargs = {
      url: `/panoptes/Docs/${this.config.dataset}/${onClickClusterComponentTemplateDocPath}`
    };

    requestContext.request(
      (componentCancellation) => {

        let promises = [
          LRUCache.get(
            `query${JSON.stringify(locationAPIargs)}`, (cacheCancellation) =>
              API.query({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          )
        ];

        // Don't make these calls unnecessarily.
        if (onClickSingleComponentTemplateDocPath !== undefined) {
          promises.push(
            LRUCache.get(
              `staticContent${JSON.stringify(onClickSingleTemplateAPIargs)}`, (cacheCancellation) =>
                API.staticContent({
                  cancellation: cacheCancellation,
                  ...onClickSingleTemplateAPIargs
                }),
              componentCancellation
            )
          );
        }
        if (onClickClusterComponentTemplateDocPath !== undefined) {
          promises.push(
            LRUCache.get(
              `staticContent${JSON.stringify(onClickClusterTemplateAPIargs)}`, (cacheCancellation) =>
                API.staticContent({
                  cancellation: cacheCancellation,
                  ...onClickClusterTemplateAPIargs
                }),
              componentCancellation
            )
          );
        }

        return Promise.all(promises);
      }
    )
      .then(([data, onClickComponentTemplate]) => {

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

        this.setState({markersGroupedByLocation, minValue, maxValue, onClickComponentTemplate});
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
    let {
      markerColourProperty, table, showLegend, maxLegendItems,
      disableOnClickMarker, clusterMarkers, children, clickPrimaryKeyProperty,
      clickTable,
      onClickSingleBehaviour,
      onClickSingleComponent,
      onClickSingleComponentProps,
      onClickClusterBehaviour,
      onClickClusterComponent,
      onClickClusterComponentProps,
    } = this.props;

    let {markersGroupedByLocation, minValue, maxValue, onClickClusterComponentTemplate, onClickSingleComponentTemplate} = this.state;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    if (_isEmpty(markersGroupedByLocation)) {
      return null;
    }

    // NOTE: clickPrimaryKeyProperty should probably be deprecated, but is still supported here.
    // Change default onClickSingleBehaviour if clickPrimaryKeyProperty is defined.
    if (clickPrimaryKeyProperty !== undefined) {
      onClickSingleBehaviour = 'tooltip';
      // Default to using table for clickTable.
      if (clickTable === undefined) {
        clickTable = table;
      }
    }

    let markerColourPropertyIsNumerical = false;
    let markerColourPropertyIsCategorical = false;

    if (markerColourProperty !== undefined && markerColourProperty !== null) {
      markerColourPropertyIsNumerical = this.config.tablesById[table].propertiesById[markerColourProperty].isNumerical;
      markerColourPropertyIsCategorical = this.config.tablesById[table].propertiesById[markerColourProperty].isCategorical;
    }

    let markers = [];
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

        markers.push({
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

        markers.push({
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
    if (markers.length > 0) {

      // NB: Copied from PieChartMarkersLayer
      let size = map.getSize();
      let bounds = map.getBounds();
      let pixelArea = size.x * size.y;
      let pieAreaSum = _sum(_map(
        _filter(markers, (marker) => {
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
      _forEach(markers, (marker) => marker.radius = Math.max(10, marker.originalRadius * lengthRatio));
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
            <GeoLayouter nodes={markers}>
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

                          let key = undefined;
                          let query = undefined;
                          if (onClickClusterComponent === undefined) {

                            // If no onClickClusterComponent has been defined,
                            // then use the table's listView to determine the default component,
                            // i.e. whether to use ListWithActions or DataTableWithActions.

                            if (this.config.tablesById[table].listView) {
                              onClickClusterComponent = 'ListWithActions';
                            } else {
                              onClickClusterComponent = 'DataTableWithActions';
                            }
                          }

                          if (onClickClusterComponent === 'DataTableWithActions') {

                            // Compose the default key and query for DataTableWithActions
                            // NOTE: these may be overridden via onClickClusterComponentProps

                            let positionQuery = SQL.WhereClause.AND([
                              SQL.WhereClause.CompareFixed(marker.latProperty, '=', marker.originalLat),
                              SQL.WhereClause.CompareFixed(marker.lngProperty, '=', marker.originalLng)
                            ]);

                            let encodedPopupQuery = undefined;
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
                            key = `${table}_${encodedPopupQuery}`;
                            query = encodedPopupQuery;
                          }

                          // NOTE: onClickClusterComponentProps should have been converted automatically
                          // from a string (element attribute value in template) to a JSON object.
                          // NOTE: Need to clone onClickClusterComponentProps,
                          // otherwise properties will remain set to the defaults, as though they had been specified explicitly.
                          const onClickClusterComponentPropsJSON = onClickClusterComponentProps !== undefined ? _clone(onClickClusterComponentProps) : {};

                          const onClickClusterComponentDefaultProps = {
                            table: marker.table,
                            originalLat: marker.originalLat,
                            originalLng: marker.originalLng,
                            latProperty: marker.latProperty,
                            lngProperty: marker.lngProperty,
                            key,
                            query,
                            flux: this.getFlux(),
                          };

                          const onClickClusterComponentMergedProps = {...onClickClusterComponentDefaultProps, ...onClickClusterComponentPropsJSON};
                          const onClickClusterReactElement = onClickClusterComponent !== undefined ? React.createElement(onClickClusterComponent, onClickClusterComponentMergedProps, onClickClusterComponentTemplate) : undefined;

                          let onClickClusterTooltipReactElement = undefined;
                          if (onClickClusterBehaviour === 'tooltip' && onClickClusterComponent === 'DataTableWithActions') {
                            onClickClusterTooltipReactElement = React.createElement(DataTableWithActions, onClickClusterComponentMergedProps, onClickClusterComponentTemplate);
                          } else if (onClickClusterBehaviour === 'tooltip' && onClickClusterComponent === 'ListWithActions') {
                            onClickClusterTooltipReactElement = React.createElement(ListWithActions, onClickClusterComponentMergedProps, onClickClusterComponentTemplate);
                          } else if (onClickClusterBehaviour === 'tooltip' && onClickClusterComponent === 'Template') {
                            onClickClusterTooltipReactElement = React.createElement(Template, onClickClusterComponentMergedProps, onClickClusterComponentTemplate);
                          } else if (onClickClusterBehaviour === 'tooltip') {
                            // FIXME: Allow any other components.
                            console.error('onClickClusterBehaviour tooltip currently only supports onClickClusterComponent DataTableWithActions and ListWithActions, not: ', onClickClusterComponent);
                          }

                          return (
                            <ComponentMarker
                              key={`ComponentMarker_${i}`}
                              position={{lat: marker.lat, lng: marker.lng}}
                              onClick={disableOnClickMarker ? null : (e) => this.handleClickClusterMarker(e, onClickClusterReactElement)}
                              zIndexOffset={0}
                              popup={onClickClusterTooltipReactElement}
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
                markers.map(
                  (marker, i) => {

                    // NOTE: onClickSingleComponentProps should have been converted automatically
                    // from a string (element attribute value in template) to a JSON object.
                    // NOTE: Need to clone onClickSingleComponentProps,
                    // otherwise properties will remain set to the defaults, as though they had been specified explicitly.
                    const onClickSingleComponentPropsJSON = onClickSingleComponentProps !== undefined ? _clone(onClickSingleComponentProps) : {};

                    const onClickSingleComponentDefaultProps = {
                      table: marker.table,
                      primKey: marker.primKey,
                      originalLat: marker.originalLat,
                      originalLng: marker.originalLng,
                      latProperty: marker.latProperty,
                      lngProperty: marker.lngProperty,
                      flux: this.getFlux(),
                    };

                    const onClickSingleComponentMergedProps = {...onClickSingleComponentDefaultProps, ...onClickSingleComponentPropsJSON};
                    const onClickSingleReactElement = onClickSingleComponent !== undefined ? React.createElement(onClickSingleComponent, onClickSingleComponentMergedProps, onClickSingleComponentTemplate) : undefined;

                    let onClickSingleTooltipReactElement = undefined;
                    if (onClickSingleBehaviour === 'tooltip' && onClickSingleComponent === undefined && clickPrimaryKeyProperty !== undefined) {
                      // Default to set of ItemLinks
                      onClickSingleTooltipReactElement = (
                        <span>
                          {_map(marker.clickPrimKeyBreakdown, (val, key) =>
                            <div><ItemLink flux={this.getFlux()} table={clickTable} primKey={key} />: {val} {this.config.tablesById[marker.table]['capName' + (val > 1 ? 'Plural' : 'Single')]}</div>
                          )}
                        </span>
                      );
                    } else if (onClickSingleBehaviour === 'tooltip' && onClickSingleComponent === 'ItemTemplate') {
                      onClickSingleTooltipReactElement = React.createElement(ItemTemplate, onClickSingleComponentMergedProps, onClickSingleComponentTemplate);
                    } else if (onClickSingleBehaviour === 'tooltip') {
                      // FIXME: Allow any component.
                      // TODO: clickTable and clickPrimaryKeyProperty should probably be deprecated in favour of templated tooltips.
                      console.error('onClickSingleBehaviour tooltip currently only supports onClickSingleComponent ItemTemplate or undefined-with-clickPrimaryKeyProperty, not: ', onClickSingleComponent, clickPrimaryKeyProperty);
                    }

                    return (
                      <ComponentMarker
                        key={`ComponentMarker_${i}`}
                        position={{lat: marker.lat, lng: marker.lng}}
                        onClick={disableOnClickMarker || clickPrimaryKeyProperty ? null : (e) => this.handleClickSingleMarker(e,
                          onClickSingleComponentMergedProps,
                          onClickSingleReactElement
                        )}
                        zIndexOffset={0}
                        popup={onClickSingleTooltipReactElement}
                      >
                        {children}
                      </ComponentMarker>
                    );
                  })
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

export default TableMarkersLayer;

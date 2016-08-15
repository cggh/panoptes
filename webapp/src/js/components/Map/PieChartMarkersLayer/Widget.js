import React from 'react';
import Immutable from 'immutable';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import API from 'panoptes/API';
import ComponentMarkerWidget from 'Map/ComponentMarker/Widget';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import LRUCache from 'util/LRUCache';
import PieChartWidget from 'Chart/Pie/Widget';
import CalcMapBounds from 'utils/CalcMapBounds';


// Lodash
import _sumBy from 'lodash/sumBy';


let PieChartMarkersLayerWidget = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'chartDataTable', 'primKey', 'highlight')
  ],

  contextTypes: { //FIXME
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    setBounds: React.PropTypes.func,
    setLoadStatus: React.PropTypes.func
  },
  propTypes: {
    defaultResidualFractionName: React.PropTypes.string,
    defaultResidualSectorColor: React.PropTypes.string,
    chartDataTable: React.PropTypes.string.isRequired,
    componentColumns: React.PropTypes.object.isRequired,
    primKey: React.PropTypes.string.isRequired,
    locationDataTable: React.PropTypes.string.isRequired,
    locationNameProperty: React.PropTypes.string,
    locationSizeProperty: React.PropTypes.string,
    residualFractionName: React.PropTypes.string,
    residualSectorColor: React.PropTypes.string
  },
  childContextTypes: {
    onClickMarker: React.PropTypes.func
  },

  getChildContext() {
    return {
      onClickMarker: this.handleClickMarker
    };
  },
  getDefaultProps() {
    return {
      defaultResidualFractionName: 'Other',
      defaultResidualSectorColor: 'rgb(191,191,191)'
    };
  },
  getInitialState() {
    return {
      markers: Immutable.List()
    };
  },

  // Event handlers
  handleClickMarker(e, marker) {
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.get('chartDataTable'), primKey: marker.get('primKey'), switchTo: !middleClick});
  },

  fetchData(props, requestContext) {

    let {
      defaultResidualFractionName,
      defaultResidualSectorColor,
      locationDataTable,
      locationNameProperty,
      locationSizeProperty,
      primKey,
      chartDataTable,
      componentColumns,
      residualFractionName,
      residualSectorColor
    } = props;

    let {setBounds, setLoadStatus} = this.context; //FIXME

    let locationTableConfig = this.config.tablesById[locationDataTable];
    if (locationTableConfig === undefined) {
      console.error('locationTableConfig === undefined');
      return null;
    }
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    setLoadStatus('loading');

    let locationPrimKeyProperty = locationTableConfig.primKey;

    // TODO: support lngProperty and latProperty props, to specify different geo columns.
    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    // let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    // let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationLongitudeProperty = locationTableConfig.longitude;
    let locationLatitudeProperty = locationTableConfig.latitude;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    if (locationNameProperty) {
      locationColumns.push(locationNameProperty);
    }

    if (locationSizeProperty) {
      locationColumns.push(locationSizeProperty);
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesById[column].defaultDisplayEncoding);

    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: chartDataTable,
      primKeyField: this.config.tablesById[chartDataTable].primKey,
      primKeyValue: primKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.pageQuery({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          ),
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(chartAPIargs), (cacheCancellation) =>
              API.fetchSingleRecord({
                cancellation: cacheCancellation,
                ...chartAPIargs
              }),
            componentCancellation
          )
        ])
      )
      .then(([locationData, chartData]) => {

        let markers = Immutable.List();

        // Translate the fetched locationData and chartData into markers.
        let locationTableConfig = this.config.tablesById[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        for (let i = 0; i < locationData.length; i++) {
          let markerChartData = [];
          let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

          // FIXME: ???
          let componentColumnsArray = componentColumns.toArray();

          for (let j = 0; j < componentColumnsArray.length; j++) {
            let chartDataColumnIndex = componentColumnsArray[j].get('pattern').replace('{locid}', locationDataPrimKey);
            markerChartData.push({
              name: componentColumnsArray[j].get('name'),
              value: chartData[chartDataColumnIndex] !== null ? chartData[chartDataColumnIndex] : 0,
              color: componentColumnsArray[j].get('color')
            });
          }

          // NB: undefined == null, undefined !== null
          let sum = _sumBy(markerChartData, 'value');
          if (sum < 1)
            markerChartData.push({
              name: residualFractionName != null ? residualFractionName : defaultResidualFractionName,
              value: (1 - sum).toFixed(2),
              color: residualSectorColor != null ? residualSectorColor : defaultResidualSectorColor
            });

          markers = markers.push(Immutable.fromJS({
            chartDataTable: chartDataTable,
            key: i,
            lat: locationData[i][locationTableConfig.latitude],
            lng: locationData[i][locationTableConfig.longitude],
            name: locationData[i][locationNameProperty],
            radius: Math.sqrt(locationData[i][locationSizeProperty]),
            chartData: markerChartData,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey,
            primKey: primKey
          }));

        }

        this.setState({markers});
        setBounds(CalcMapBounds.calcMapBounds(markers)); //FIXME
        setLoadStatus('loaded');
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        setLoadStatus('error');
      });
  },

  render() {

    let {layerContainer, map} = this.context;
    let {markers} = this.state;

    if (!markers.size) {
      return null;
    }

    // FIXME
    //let crs = this.context.map ? this.context.map.leafletElement.options.crs : window.L.CRS.EPSG3857;
    let crs = window.L.CRS.EPSG3857;

    let markerWidgets = [];

    for (let i = 0, len = markers.size; i < len; i++) {

      let marker = markers.get(i);

      markerWidgets.push(
        <ComponentMarkerWidget
          key={i}
          position={[marker.get('lat'), marker.get('lng')]}
          title={marker.get('title')}
          onClick={(e) => this.handleClickMarker(e, marker)}
        >
          <PieChartWidget
            chartData={marker.get('chartData')}
            crs={crs}
            key={i}
            lat={marker.get('lat')}
            lng={marker.get('lng')}
            name={marker.get('name')}
            originalLat={marker.get('lat')}
            originalLng={marker.get('lng')}
            radius={marker.get('radius')}
          />
        </ComponentMarkerWidget>
      );

    }

    return (
      <FeatureGroupWidget
        children={markerWidgets}
        layerContainer={layerContainer}
        map={map}
      />
    );

  }

});

module.exports = PieChartMarkersLayerWidget;

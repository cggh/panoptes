import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import MapWidget from 'Map/Widget';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import PieChartMarkersLayerWidget from 'Map/PieChartMarkersLayer/Widget';

let PieChartMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: { // NB: componentColumns is not easy enough to supply via template
    chartDataTable: React.PropTypes.string,
    center: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array, React.PropTypes.object]),
    componentColumns: React.PropTypes.object,
    componentUpdate: React.PropTypes.func.isRequired,
    locationDataTable: React.PropTypes.string,
    locationNameProperty: React.PropTypes.string,
    locationSizeProperty: React.PropTypes.string,
    primKey: React.PropTypes.string,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
  },

  title() {
    return this.props.title || 'Pie Chart Map';
  },

  render() {

    let {
      center,
      chartDataTable,
      componentColumns,
      componentUpdate,
      locationDataTable,
      locationNameProperty,
      locationSizeProperty,
      primKey,
      table,
      zoom,
    } = this.props;

    // NB: The table prop is passed by Panoptes, e.g. DataItem/Widget
    // The chartDataTable prop is named to distinguish it from the locationDataTable.
    // Either "table" or "chartDataTable" can be used in templates,
    // with chartDataTable taking preference when both are specfied.
    if (chartDataTable === undefined && table !== undefined) {
      chartDataTable = table;
    }

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    return (
      <MapWidget
        center={center}
        componentUpdate={componentUpdate}
        style={widgetStyle}
        zoom={zoom}
      >
        <FeatureGroupWidget>
          <TileLayerWidget />
          <PieChartMarkersLayerWidget
            locationDataTable={locationDataTable}
            chartDataTable={chartDataTable}
            componentColumns={componentColumns}
            locationNameProperty={locationNameProperty}
            locationSizeProperty={locationSizeProperty}
            primKey={primKey}
          />
        </FeatureGroupWidget>
      </MapWidget>
    );

  }

});

module.exports = PieChartMapWidget;

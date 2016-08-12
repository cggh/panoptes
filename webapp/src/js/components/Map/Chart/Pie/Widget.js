import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import MapWidget from 'Map/Widget';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import PieChartMarkersLayerWidget from 'Map/PieChartMarkersLayer/Widget';


/* Example usage in templates

<p>A map of pie charts:</p>
<div style="position:relative;width:300px;height:300px">
<PieChartMap locationDataTable="populations" chartDataTable="variants" primKey="SNP_00001" />
</div>

*/

let PieChartMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: { // NB: componentColumns is not easy enough to supply via template
    locationDataTable: React.PropTypes.string,
    chartDataTable: React.PropTypes.string,
    componentColumns: React.PropTypes.object,
    locationNameProperty: React.PropTypes.string,
    locationSizeProperty: React.PropTypes.string,
    primKey: React.PropTypes.string,
    table: React.PropTypes.string,
    title: React.PropTypes.string
  },

  title() {
    return this.props.title || 'Pie Chart Map';
  },

  render() {
console.log('PieChartWidget props: %o', this.props);

    let {
      locationDataTable,
      chartDataTable,
      componentColumns,
      locationNameProperty,
      locationSizeProperty,
      primKey,
      table
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
      <MapWidget style={widgetStyle}>
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

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
<PieChartMap geoTable="populations" pieTable="variants" primKey="SNP_00001" />
</div>

*/

let PieChartMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    geoTable: React.PropTypes.string,
    pieTable: React.PropTypes.string,
    primKey: React.PropTypes.string,
    title: React.PropTypes.string
  },

  title() {
    return this.props.title || 'Pie Chart Map';
  },

  render() {

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    return (
      <MapWidget style={widgetStyle}>
        <FeatureGroupWidget>
          <TileLayerWidget />
          <PieChartMarkersLayerWidget geoTable={this.props.geoTable} pieTable={this.props.pieTable} primKey={this.props.primKey} />
        </FeatureGroupWidget>
      </MapWidget>
    );

  }

});

module.exports = PieChartMapWidget;

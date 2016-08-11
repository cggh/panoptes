import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import MapWidget from 'Map/Widget';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import TableMarkersLayerWidget from 'Map/TableMarkersLayer/Widget';


/* Example usage in templates

<p>A map of sampling sites:</p>
<div style="position:relative;width:300px;height:300px">
<TableMap geoTable="samplingsites" />
</div>

<p>A map of a sampling site:</p>
<div style="position:relative;width:300px;height:300px">
<TableMap geoTable="samplingsites" primKey="St04" />
</div>

*/

let TableMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    geoTable: React.PropTypes.string,
    primKey: React.PropTypes.string,
    title: React.PropTypes.string
  },

  title() {
    return this.props.title || 'Table Map';
  },

  render() {

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

console.log('TableMapWidget props: %o', this.props);

    return (
      <MapWidget style={widgetStyle}>
        <FeatureGroupWidget>
          <TileLayerWidget />
          <TableMarkersLayerWidget geoTable={this.props.geoTable} primKey={this.props.primKey} />
        </FeatureGroupWidget>
      </MapWidget>
    );

  }

});

module.exports = TableMapWidget;

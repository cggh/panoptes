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
<TableMap table="samplingsites" />
</div>

<p>A map highlighting a sampling site:</p>
<div style="position:relative;width:300px;height:300px">
<TableMap table="samplingsites" primKey="St04" />
</div>

<p>A map highlighting UK sampling sites:</p>
<div style="position:relative;width:300px;height:300px">
<TableMap table="samplingsites" highlight="Country:UK" />
</div>

*/

let TableMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    setProps: React.PropTypes.func,
    highlight: React.PropTypes.string,
    locationDataTable: React.PropTypes.string,
    onChange: React.PropTypes.func,
    primKey: React.PropTypes.string,
    query: React.PropTypes.string,
    table: React.PropTypes.string,
    tileLayerProps: React.PropTypes.object,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
  },

  title() {
    return this.props.title || 'Table Map';
  },

  render() {

    let {
      center,
      setProps,
      highlight,
      locationDataTable,
      onChange,
      primKey,
      query,
      table,
      tileLayerProps,
      zoom
    } = this.props;

    // NB: The table prop is passed by Panoptes, e.g. DataItem/Widget
    // The locationDataTable prop is named to distinguish it from the chartDataTable.
    // Either "table" or "locationDataTable" can be used in templates,
    // with locationDataTable taking preference when both are specfied.
    if (locationDataTable === undefined && table !== undefined) {
      locationDataTable = table;
    }

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    return (
      <MapWidget
        center={center}
        setProps={setProps}
        onChange={onChange}
        style={widgetStyle}
        zoom={zoom}
      >
        <FeatureGroupWidget>
          <TileLayerWidget {...tileLayerProps} />
          <TableMarkersLayerWidget
            highlight={highlight}
            locationDataTable={locationDataTable}
            primKey={primKey}
            query={query}
          />
        </FeatureGroupWidget>
      </MapWidget>
    );

  }

});

module.exports = TableMapWidget;

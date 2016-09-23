import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import BaseLayerWidget from 'Map/BaseLayer/Widget';
import ImageOverlayWidget from 'Map/ImageOverlay/Widget';
import LayersControlWidget from 'Map/LayersControl/Widget';
import MapWidget from 'Map/Widget';
import OverlayWidget from 'Map/Overlay/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import TableMarkersLayerWidget from 'Map/TableMarkersLayer/Widget';

// NB: This is a void component; no children allowed.
// Although, the components returned by this component may have children.

/* Example usage in templates

<p>A map of sampling sites:</p>
<div style="position:relative;width:300px;height:300px">
<TableMapWidget table="samplingsites" />
</div>

<p>A map highlighting a sampling site:</p>
<div style="position:relative;width:300px;height:300px">
<TableMapWidget table="samplingsites" primKey="St04" />
</div>

<p>A map highlighting UK sampling sites:</p>
<div style="position:relative;width:300px;height:300px">
<TableMapWidget table="samplingsites" highlight="Country:UK" />
</div>

*/

let TableMapWidget = React.createClass({

  mixins: [
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    baseLayer: React.PropTypes.object,
    center: React.PropTypes.object,
    highlight: React.PropTypes.string,
    imageOverlay: React.PropTypes.object,
    locationDataTable: React.PropTypes.string, // Either locationDataTable or table are required
    onChange: React.PropTypes.func,
    overlay: React.PropTypes.object,
    primKey: React.PropTypes.string,
    query: React.PropTypes.string,
    setProps: React.PropTypes.func,
    table: React.PropTypes.string, // Either locationDataTable or table are required
    tileLayerProps: React.PropTypes.object,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
  },

  title() {
    return this.props.title || 'Table Map';
  },

  render() {

    let {
      baseLayer,
      center,
      highlight,
      imageOverlay,
      locationDataTable,
      onChange,
      overlay,
      primKey,
      query,
      setProps,
      table,
      zoom
    } = this.props;

    // NB: The table prop is passed by Panoptes, e.g. DataItem/Widget
    // The locationDataTable prop is named to distinguish it from the chartDataTable.
    // Either "table" or "locationDataTable" can be used in templates,
    // with locationDataTable taking preference when both are specfied.
    if (locationDataTable === undefined && table !== undefined) {
      locationDataTable = table;
    }

    // NB: If baseLayer is not defined, then a BaseLayerWidget with a default TileLayerWidget will be used.

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
        <LayersControlWidget>
          <BaseLayerWidget checked={true} name={baseLayer ? baseLayer.name : undefined}>
            <TileLayerWidget zIndex={1} {...baseLayer} />
          </BaseLayerWidget>
          {overlay ?
          <OverlayWidget checked={true} name={overlay.name}>
            <TileLayerWidget zIndex={2} {...overlay} />
          </OverlayWidget>
          : null}
          {imageOverlay ?
          <OverlayWidget checked={true} name={imageOverlay.name}>
            <ImageOverlayWidget {...imageOverlay} />
          </OverlayWidget>
          : null}
          <OverlayWidget checked={true} name={this.config.tablesById[locationDataTable].capNamePlural}>
            <TableMarkersLayerWidget
              highlight={highlight}
              locationDataTable={locationDataTable}
              primKey={primKey}
              query={query}
            />
          </OverlayWidget>
        </LayersControlWidget>
      </MapWidget>
    );

  }

});

module.exports = TableMapWidget;

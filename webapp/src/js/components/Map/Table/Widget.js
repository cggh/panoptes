import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import Map from 'Map/Widget';
import SQL from 'panoptes/SQL';
import TileLayer from 'Map/TileLayer/Widget';
import TableMarkersLayer from 'Map/TableMarkersLayer/Widget';

// NB: This is a void component; no children allowed.
// Although, the components returned by this component may have children.

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

let TableMap = React.createClass({

  mixins: [
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    highlight: React.PropTypes.string,
    locationDataTable: React.PropTypes.string, // Either locationDataTable or table are required
    onChange: React.PropTypes.func,
    primKey: React.PropTypes.string,
    query: React.PropTypes.string,
    setProps: React.PropTypes.func,
    table: React.PropTypes.string, // Either locationDataTable or table are required
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
  },

  title() {
    return this.props.title || 'Table Map';
  },

  getDefinedQuery() {
    let definedQuery = this.props.query;
    if (definedQuery === undefined) {
      definedQuery = this.tableConfig().defaultQuery !== undefined ? this.tableConfig().defaultQuery : SQL.nullQuery;
    }
    return definedQuery;
  },

  render() {

    let {
      center,
      highlight,
      locationDataTable,
      onChange,
      primKey,
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

    let locationTableConfig = this.config.tablesById[locationDataTable];
    if (locationTableConfig === undefined) {
      console.error('locationTableConfig === undefined');
      return null;
    }

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    return (
      <Map
        center={center}
        setProps={setProps}
        onChange={onChange}
        style={widgetStyle}
        zoom={zoom}
      >
        <TileLayer />
        <TableMarkersLayer
          highlight={highlight}
          locationDataTable={locationDataTable}
          primKey={primKey}
          query={this.getDefinedQuery()}
        />
      </Map>
    );

  }

});

module.exports = TableMap;

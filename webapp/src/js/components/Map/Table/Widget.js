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
    onChange: React.PropTypes.func,
    primKey: React.PropTypes.string,
    query: React.PropTypes.string,
    setProps: React.PropTypes.func,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
  },

  title() {
    return this.props.title || 'Table Map';
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {

    let {
      center,
      highlight,
      onChange,
      primKey,
      setProps,
      table,
      zoom
    } = this.props;

    let tableConfig = this.config.tablesById[table];
    if (tableConfig === undefined) {
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
          table={table}
          primKey={primKey}
          query={this.getDefinedQuery()}
        />
      </Map>
    );

  }

});

module.exports = TableMap;

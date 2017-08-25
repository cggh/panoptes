import PropTypes from 'prop-types';
import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import Map from 'Map/Map';
import SQL from 'panoptes/SQL';
import TileLayer from 'Map/TileLayer';
import TableMarkersLayer from 'Map/TableMarkersLayer';

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
    center: PropTypes.object,
    customControls: PropTypes.array,
    highlight: PropTypes.string,
    markerColourProperty: PropTypes.string,
    onChange: PropTypes.func,
    primKey: PropTypes.string,
    query: PropTypes.string,
    setProps: PropTypes.func,
    table: PropTypes.string,
    title: PropTypes.string,
    zoom: PropTypes.number,
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
      customControls,
      highlight,
      markerColourProperty,
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

    return (
      <Map
        center={center}
        customControls={customControls}
        setProps={setProps}
        onChange={onChange}
        style={{height: '100%'}}
        zoom={zoom}
      >
        <TileLayer />
        <TableMarkersLayer
          highlight={highlight}
          table={table}
          primKey={primKey}
          query={this.getDefinedQuery()}
          markerColourProperty={markerColourProperty}
        />
      </Map>
    );

  }

});

export default TableMap;

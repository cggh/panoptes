const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const LRUCache = require('util/LRUCache');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Panoptes components
const API = require('panoptes/API');
const SQL = require('panoptes/SQL');
const Map = require('panoptes/Map');

// UI components
const Loading = require('ui/Loading');

let MapContainer = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table')
  ],

  propTypes: {
    title: React.PropTypes.string,
    center: React.PropTypes.object,
    zoom: React.PropTypes.number,
    table: React.PropTypes.string,
    locationNameProperty: React.PropTypes.string,
    locationSizeProperty: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      center: {lat: 0, lng:  0}
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded'
    };
  },


  fetchData(props, requestContext)
  {
    let {table, locationNameProperty, locationSizeProperty} = props;

    let tableConfig = this.config.tables[table];

    if (tableConfig.hasGeoCoord)
    {
      this.setState({loadStatus: 'loading'});

      let columns = [tableConfig.propIdGeoCoordLongit, tableConfig.propIdGeoCoordLattit];

      if (locationNameProperty)
      {
        columns.push(locationNameProperty);
      }

      if (locationSizeProperty)
      {
        columns.push(locationSizeProperty);
      }

      let columnspec = {};
      columns.map(column => columnspec[column] = tableConfig.propertiesMap[column].defaultDisplayEncoding);

      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec
      };
      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'pageQuery' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
            this.setState({loadStatus: 'loaded',
                           rows: data});
        })
          .catch((error) => {
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
            this.setState({loadStatus: 'error'});
          });
    }
    else
    {
     config.log("tableConfig.hasGeoCoord is false");
    }

  },

  title() {
    return this.props.title;
  },

  render()
  {
    let {title, center, zoom, table, locationNameProperty, locationSizeProperty} = this.props;
    let {rows, loadStatus} = this.state;

    let markers = [];

    if (rows)
    {
      // Translate the fetched rows into markers.

      let tableConfig = this.config.tables[table];

      for (let i = 0; i < rows.length; i++)
      {
        markers.push({lat: rows[i][tableConfig.propIdGeoCoordLattit], lng: rows[i][tableConfig.propIdGeoCoordLongit]});
      }
    }

    return (
      <div style = {{width:'100%', height:'100%'}}>
        <Map center={center} zoom={zoom} markers={markers} />
        <Loading status={loadStatus}/>
      </div>
    );

  }

});

module.exports = MapContainer;

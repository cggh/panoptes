const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const shallowEquals = require('shallow-equals');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Panoptes components
const API = require('panoptes/API');
const ErrorReport = require('panoptes/ErrorReporter');
const PropertyList = require('panoptes/PropertyList');

// UI components
const Icon = require('ui/Icon');
const Loading = require('ui/Loading');
const TabbedArea = require('ui/TabbedArea');
const TabPane = require('ui/TabPane');

let DataItem = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
  },
  
  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props) {
    let {table, primKey} = props;
    this.setState({loadStatus: 'loading'});
    API.fetchSingleRecord({
      database: this.config.dataset,
      table: table,
      primKeyField: this.config.tables[table].primkey,
      primKeyValue: primKey}
    )
      .then((data) => {
        if (shallowEquals(props, this.props)) {
          this.setState({loadStatus: 'loaded'});
          this.setState({data: data});
        }
      })
      .catch((error) => {
      ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
      this.setState({loadStatus: 'error'});
    });

  },

  icon() {
    return this.config.tables[this.props.table].icon;
  },

  title() {
    return `${this.config.tables[this.props.table].tableCapNameSingle} "${this.props.primKey}"`;
  },

  render() {
    let {table, primKey, componentUpdate} = this.props;
    let propertiesMap = this.config.tables[table].propertiesMap;
    let {data, loadStatus} = this.state;
    let propertyListTitle = "Overview";
    
    if (data)
      return (
                <div>
                  <TabbedArea activeTab={"something"} >
                    <TabPane compId={"something"} >
                        <PropertyList title={propertyListTitle} data={data} propertiesMap={propertiesMap}/>
                    </TabPane>
                  </TabbedArea>
                  <Loading status={loadStatus}/>
                </div>
      )
    else 
        return (
          <div>
            <Loading status="custom">No data</Loading>
          </div>
        )
        
  }

});

module.exports = DataItem;

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


// TODO: fix field name mangling at the source
function rectifyString(strObj)
{
  /*
    Convert {"0":"c","1":"h","2":"r","3":"o","4":"m","5":"o","6":"s","7":"o","8":"m","9":"e"}
    Into "chromosome"
  */
  
  let rectifiedString = "";
  for (let i = 0; i < Object.keys(strObj).length; i++)
  {
    rectifiedString += strObj[i];
  }
  
  return rectifiedString;
}

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
    primKey: React.PropTypes.string.isRequired,
    activeTab: React.PropTypes.string
  },

  // TODO: if there is no activeTab, then show the Overview or the first tab.
  getInitialState() {
    return {
      loadStatus: 'loaded',
      activeTab: 'Overview'
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
    let {table, primKey, componentUpdate, activeTab} = this.props;
    let {data, loadStatus} = this.state;
    
    let dataItemViews = this.config.tables[table].settings.dataItemViews;
    let propertiesDataIndexes = {};
    let propertiesDataUsingGroupId = {};
    
    // Make a clone of the propertiesData
    let propertiesData = _.cloneDeep(this.config.tables[table].properties);
    if (data)
    {
      for (let i = 0; i < propertiesData.length; i++)
      {
        // Augment the array element with the fetched value of the property.
        propertiesData[i].value = data[propertiesData[i].propid];
        
        // Record which property each propertiesData index relates to.
        propertiesDataIndexes[propertiesData[i].propid] = i;
        
        // Record which properties are in each property group.
        if (typeof propertiesDataUsingGroupId[propertiesData[i].settings.groupId] == 'undefined')
        {
          propertiesDataUsingGroupId[propertiesData[i].settings.groupId] = [];
        }
        propertiesDataUsingGroupId[propertiesData[i].settings.groupId].push(propertiesData[i]);
        
      }
    }
    
    let tabPanes = [];
    
    if (!dataItemViews)
    {
      if (data)
      {
        let tabPane = (
          <TabPane key="0" compId="overview" >
              <PropertyList title="Overview" propertiesData={propertiesData} className='table-col' />
          </TabPane>
        );
        
        tabPanes.push(tabPane);
      }
    }
    else
    {
      for (let i = 0; i < dataItemViews.length; i++)
      {
        let tabPaneCompId = dataItemViews[i].name;
        let tabPaneContents = null;
        
        if (dataItemViews[i].type === "Overview" && data)
        {
          tabPaneContents = (
            <PropertyList title={dataItemViews[i].name} propertiesData={propertiesData} className='table-col' />
          )
        }
        if (dataItemViews[i].type === "PieChartMap")
        {
          tabPaneContents = (
            <div>PieChartMap, TODO</div>
          )
        }
        if (dataItemViews[i].type === "ItemMap")
        {
          tabPaneContents = (
            <div>ItemMap, TODO</div>
          )
        }
        if (dataItemViews[i].type === "FieldList" && data)
        {
          let fieldListPropertiesData = [];
          for (let j = 0; j < dataItemViews[i].fields.length; j++)
          {
            // TODO: fix field name mangling at the source
            let rectifiedFieldName = rectifyString(dataItemViews[i].fields[j]);
            
            fieldListPropertiesData.push(propertiesData[propertiesDataIndexes[rectifiedFieldName]]);
          }
          
          tabPaneContents = (
            <PropertyList title={dataItemViews[i].name} propertiesData={fieldListPropertiesData} className='table-col' />
          )
        }
        if (dataItemViews[i].type === "PropertyGroup" && data)
        {
          tabPaneContents = (
            <PropertyList title={dataItemViews[i].name} propertiesData={propertiesDataUsingGroupId[dataItemViews[i].groupId]} className='table-col' />
          )
        }
        if (dataItemViews[i].type === "Template")
        {
          tabPaneContents = (
            <div>Template, TODO</div>
          )
        }
        
        if (tabPaneContents)
        {
          let tabPane = (
            <TabPane key={i} compId={tabPaneCompId} >
                {tabPaneContents}
            </TabPane>
          );
        
          tabPanes.push(tabPane);
        }
        
      }
    }
    
    return (
        <div>
          <TabbedArea activeTab={activeTab} onSwitch={(id) => componentUpdate({activeTab:id})} >
            {tabPanes}
          </TabbedArea>
          <Loading status={loadStatus}/>
        </div>
    )
    
  }
  
});

module.exports = DataItem;

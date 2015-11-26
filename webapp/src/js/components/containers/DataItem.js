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

// Containers
const MapContainer = require('containers/MapContainer');

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
    primKey: React.PropTypes.string.isRequired,
    activeTab: React.PropTypes.string
  },

  getDefaultProps: function() {
    return {
      activeTab: 'tab_0'
    };
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
          this.setState({loadStatus: 'loaded', data: data});
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
    
    let dataItemViews = this.config.tables[table].dataItemViews;
    let propertiesDataIndexes = {};
    let propertiesDataUsingGroupId = {};
    
    // Get the PropertyGroupData
    let propertyGroupsData = this.config.tables[table].propertyGroups;
    
    // Make a clone of the propertiesData, which will be augmented.
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
        // If there are no dataItemViews specified, but there are fetched data, then default to showing an Overview.
        let tabPane = (
          <TabPane key="0" compId="tab_0" >
              <PropertyList title="Overview" propertiesData={propertiesData} className='table-col' />
          </TabPane>
        );
        
        tabPanes.push(tabPane);
      }
      
      // If there are no dataItemViews specified, and there are no fetched data, then show nothing.
      
      /*
         This is an expected temporary state, which occurs while data is being fetched. 
         Having no fetched data would be unexpected, but should be anticipated as a possible error. (TODO: anticipate no fetched data) 
         DataItem opens from a hypertext link on the primKey, so we should at least have that datum.
      */
    }
    else
    {
      for (let i = 0; i < dataItemViews.length; i++)
      {
        // Compose a tabPane for each of the specified dataItemViews
        
        let tabPaneCompId = "tab_" + i;
        let tabPaneContents = null;
        
        if (dataItemViews[i].type === "Overview" && data)
        {
          tabPaneContents = (
            <PropertyList title={dataItemViews[i].name} propertiesData={propertiesData} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "PieChartMap")
        {
          tabPaneContents = (
              <MapContainer title={dataItemViews[i].name} 
                center={{lat: dataItemViews[i].mapCenter.lattitude, lng:  dataItemViews[i].mapCenter.longitude}} 
                zoom={3} 
                table={dataItemViews[i].locationDataTable} 
                locationNameProperty={dataItemViews[i].locationNameProperty}
                locationSizeProperty={dataItemViews[i].locationSizeProperty}
              />
          )
        }
        else if (dataItemViews[i].type === "ItemMap")
        {
          tabPaneContents = (
            <div>ItemMap, TODO</div>
          )
        }
        else if (dataItemViews[i].type === "FieldList" && data)
        {
          let fieldListPropertiesData = [];
          for (let j = 0; j < dataItemViews[i].fields.length; j++)
          {
            let propertiesDataIndex = propertiesDataIndexes[dataItemViews[i].fields[j]];
            if (typeof propertiesDataIndex !== 'undefined')
            {
              fieldListPropertiesData.push(propertiesData[propertiesDataIndex]);
            }
            else
            {
              console.log("Foreign property: " + dataItemViews[i].fields[j]);
            }
          }
          
          tabPaneContents = (
            <PropertyList title={dataItemViews[i].name} propertiesData={fieldListPropertiesData} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "PropertyGroup" && data)
        {
          let propertyListTitle = null;
          if (dataItemViews[i].name)
          {
            propertyListTitle = dataItemViews[i].name;
          }
          else
          {
            // Use the PropertyGroup name if there is no DataItemViews name.
            propertyListTitle = propertyGroupsData[dataItemViews[i].groupId].name;
          }
          
          
          tabPaneContents = (
            <PropertyList title={propertyListTitle} propertiesData={propertiesDataUsingGroupId[dataItemViews[i].groupId]} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "Template")
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

const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

// Containers
const OverviewTab = require('containers/OverviewTab');
const PieChartMapTab = require('containers/PieChartMapTab');
const ItemMapTab = require('containers/ItemMapTab');
const FieldListTab = require('containers/FieldListTab');
const PropertyGroupTab = require('containers/PropertyGroupTab');
const TemplateTab = require('containers/TemplateTab');

// Panoptes components
const API = require('panoptes/API');
const LRUCache = require('util/LRUCache');
const ErrorReport = require('panoptes/ErrorReporter');

// UI components
const Icon = require('ui/Icon');
const TabbedArea = require('ui/TabbedArea');
const TabPane = require('ui/TabPane');

let DataItem = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
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
  
  icon() {
    return this.config.tables[this.props.table].icon;
  },

  title() {
    return `${this.config.tables[this.props.table].tableCapNameSingle} "${this.props.primKey}"`;
  },

  render() {
    let {table, primKey, componentUpdate, activeTab} = this.props;
    
    let dataItemViews = this.config.tables[table].dataItemViews;
    
    let tabPanes = [];

    if (!dataItemViews)
    {
      // If there are no dataItemViews specified, then default to showing an Overview.
      let overviewTabPane = (
        <TabPane key="0" compId="tab_0" >
            <OverviewTab title="Overview" table={table} primKey={primKey} className='table-col' />
        </TabPane>
      );
      
      tabPanes.push(overviewTabPane);
      
      if (this.config.tables[table].hasGeoCoord)
      {
        // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing an ItemMap
        let itemMapTabPane = (
          <TabPane key="1" compId="tab_1" >
              <ItemMapTab 
                title="Location" 
                locationDataTable={table} 
                locationDataTablePrimKey={primKey} 
              />
          </TabPane>
        );
        
        tabPanes.push(itemMapTabPane);
      }
    }
    else
    {
      for (let i = 0; i < dataItemViews.length; i++)
      {
        // Compose a tabPane for each of the specified dataItemViews

        let tabPaneCompId = "tab_" + i;
        let tabPaneContents = null;
        
        if (dataItemViews[i].type === "Overview")
        {
          tabPaneContents = (
            <OverviewTab title="Overview" table={table} primKey={primKey} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "PieChartMap")
        {
          tabPaneContents = (
              <PieChartMapTab 
                title={dataItemViews[i].name} 
                center={{lat: dataItemViews[i].mapCenter.lattitude, lng: dataItemViews[i].mapCenter.longitude}} 
                locationDataTable={dataItemViews[i].locationDataTable} 
                properties={dataItemViews[i]} 
                chartDataTable={table} 
                chartDataTablePrimKey={primKey} 
              />
          )
        }
        else if (dataItemViews[i].type === "ItemMap")
        {
          tabPaneContents = (
              <ItemMapTab 
                title={dataItemViews[i].name} 
                zoom={dataItemViews[i].mapZoom} 
                locationDataTable={table} 
                locationDataTablePrimKey={primKey} 
              />
          )
        }
        else if (dataItemViews[i].type === "FieldList")
        {
          tabPaneContents = (
            <FieldListTab title={dataItemViews[i].name} fields={dataItemViews[i].fields} table={table} primKey={primKey} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "PropertyGroup")
        {
          // Determine which title to use for the PropertyGroup tab.
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
            <PropertyGroupTab title={propertyListTitle} propertyGroupId={dataItemViews[i].groupId} table={table} primKey={primKey} className='table-col' />
          )
        }
        else if (dataItemViews[i].type === "Template")
        {
          tabPaneContents = (
            <TemplateTab title={dataItemViews[i].name} table={table} primKey={primKey} content={dataItemViews[i].content} />
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
      <TabbedArea activeTab={activeTab} onSwitch={(id) => componentUpdate({activeTab:id})} >
        {tabPanes}
      </TabbedArea>
    )

  }

});

module.exports = DataItem;

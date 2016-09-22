import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import PivotTableView from 'panoptes/PivotTableView';
import PropertySelector from 'panoptes/PropertySelector';
import FilterButton from 'panoptes/FilterButton';
import SQL from 'panoptes/SQL';
import QueryString from 'panoptes/QueryString';


let PivotTableWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    columnProperty: React.PropTypes.string,
    rowProperty: React.PropTypes.string,
    columnLabel: React.PropTypes.string,
    rowLabel: React.PropTypes.string,
    instantFilter: React.PropTypes.string,
    instantFilterValue: React.PropTypes.string,
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      setProps: null,
      sidebar: true
    };
  },

  icon() {
    return 'table';
  },

  title() {
    return this.props.title || `Pivot ${this.tableConfig().namePlural}`;
  },

  render() {
    const {sidebar, table, query, columnProperty, rowProperty, instantFilterValue, instantFilter, columnLabel, rowLabel, setProps} = this.props;
    
    let sidebarContent = (
      <div className="sidebar pivot-sidebar">
        <SidebarHeader icon={this.icon()} description={`Summary and aggregates of the ${this.tableConfig().namePlural} table`}/>
        <div className="pivot-controls vertical stack">
          {(typeof instantFilter == 'undefined' || instantFilter == null ) ?
                <FilterButton table={table} query={query} onPick={(query) => this.props.setProps({query})}/>
          :
                <PropertyValueSelector table={table}
                                  key="instantFilter"
                                  propid={instantFilter}
                                  value={typeof instantFilterValue != 'undefined' ? instantFilterValue : null}
                                  label={instantFilter}
                                  filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
                                  onSelect={(v) => {
                                    let v2 = {"whcClass":"comparefixed","isCompound":false,"ColName":instantFilter,"CompValue":v,"isRoot":true,"Tpe":"="} ;
                                    let query = JSON.stringify(v2) ;
                                    this.props.setProps({query})
                                    }
                                  }/>
          }

          {(columnLabel=='hide')?'':
            <PropertySelector table={table}
                              key="columnProperty"
                              value={this.config.tablesById[table].propertiesById[columnProperty] ? columnProperty : null}
                              allowNull={true}
                              label={(typeof columnLabel=='undefined')?"Column":columnLabel}
                              filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
                              onSelect={(v) => setProps({columnProperty: v})}/>
          }

          {(rowLabel == 'hide') ? '' :
            <PropertySelector table={table}
                              key="rowProperty"
                              value={this.config.tablesById[table].propertiesById[rowProperty] ? rowProperty : null}
                              allowNull={true}
                              label={(typeof rowLabel == 'undefined') ? "Row" : rowLabel}
                              filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
                              onSelect={(v) => setProps({rowProperty: v})}/>
          }
        </div>
      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text"><QueryString prepend="Filter:" table={table} query={query}/></span>
          </div>
          <div className="grow">
            <PivotTableView {...this.props}/>
          </div>
          <div>
          	<div dangerouslySetInnerHTML={{__html:(columnLabel=='hide')?'':this.config.tablesById[table].propertiesById[columnProperty].description}} />
          	<div dangerouslySetInnerHTML={{__html:(rowLabel=='hide')?'':this.config.tablesById[table].propertiesById[rowProperty].description}} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = PivotTableWithActions;

import React from 'react';
import filterChildren from 'util/filterChildren';
import ValidComponentChildren from 'util/ValidComponentChildren';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// UI components
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';
import DataItemActions from 'DataItemActions';

let DataItem = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
    activeTab: React.PropTypes.string,
    children: React.PropTypes.node
  },

  getDefaultProps: function() {
    return {
      activeTab: 'view_0'
    };
  },

  icon() {
    return this.config.tablesById[this.props.table].icon;
  },

  title() {
    return `${this.config.tablesById[this.props.table].capNameSingle} "${this.props.primKey}"`;
  },

  render() {
    let {table, primKey, setProps, activeTab, children} = this.props;
    children = filterChildren(this, children); //Remove whitespace children from template padding
    return (
      <div className="vertical stack" style={{position: 'absolute'}}>
        <div className="grow">
          <TabbedArea
            activeTab={activeTab}
            onSwitch={(id) => setProps({activeTab: id})}
           >
            {ValidComponentChildren.map(children, (child, i) => {
              let viewId = `view_${i}`;
              return (
                <TabPane
                  compId={viewId}
                  key={viewId}
                >
                  {React.cloneElement(child, {table, primKey})}
                </TabPane>
              );
            })}
          </TabbedArea>
        </div>
        <div>
          <DataItemActions table={table} primKey={primKey} />
        </div>
      </div>
    );

  }

});

export default DataItem;

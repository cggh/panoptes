import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
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

let DataItem = createReactClass({
  displayName: 'DataItem',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    table: PropTypes.string.isRequired,
    primKey: PropTypes.string.isRequired,
    activeTab: PropTypes.string,
    children: PropTypes.node
  },

  getDefaultProps() {
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
    if (children.length > 1) {
      children = ValidComponentChildren.map(children, (child, i) => {
        let viewId = `view_${i}`;
        return (
          <TabPane
            compId={viewId}
            key={viewId}
          >
            {React.cloneElement(child, {table, primKey})}
          </TabPane>
        );
      });
    } else {
      children = ValidComponentChildren.map(children, (child, i) => React.cloneElement(child, {table, primKey}));
    }
    return (
      <div className="vertical stack" style={{position: 'absolute'}}>
        <div className="grow">
          {children.length > 1 ? <TabbedArea
            activeTab={activeTab}
            onSwitch={(id) => setProps({activeTab: id})}
          >
            {children}
          </TabbedArea> :
            children[0]}
        </div>
        <div>
          {children.length > 1 ? <DataItemActions table={table} primKey={primKey}/> : null}
        </div>
      </div>
    );

  },
});

export default DataItem;

import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import _isFunction from 'lodash/isFunction';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// UI components
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';
import DataItemActions from 'DataItem/Actions';

let dynreq = require.context('..', true);
const dynamicRequire = (path) => dynreq('./' + path + '/Widget');

let DataItemWidget = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
    activeTab: React.PropTypes.string,
    views: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        view: React.PropTypes.string.isRequired,
        props: ImmutablePropTypes.map
      })).isRequired
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
    let {table, primKey, componentUpdate, activeTab, views} = this.props;

    return (
      <div className="vertical stack" style={{position: 'absolute'}}>
        <div className="grow">
          <TabbedArea activeTab={activeTab}
                      onSwitch={(id) => componentUpdate({activeTab: id})} >
            {views.map((view, i) => {
              view = view.toObject();
              let viewId = `view_${i}`;
              let props = view.props ? view.props.toObject() : {};
              return (
                <TabPane
                  compId={viewId}
                  key={viewId}>
                  {React.createElement(dynamicRequire(view.view),
                    Object.assign(props,
                      {table, primKey},
                      {
                        componentUpdate: (updater) => componentUpdate((props) => {
                          if (_isFunction(updater))
                            return props.updateIn(['views', i, 'props'], updater);
                          else
                            return props.mergeIn(['views', i, 'props'], updater);
                        })
                      })
                  )}
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

module.exports = DataItemWidget;

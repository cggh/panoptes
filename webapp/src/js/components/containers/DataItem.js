const React = require('react');
const ImmutablePropTypes = require('react-immutable-proptypes');
const _isFunction = require('lodash/isFunction');


// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');

// UI components
const TabbedArea = require('ui/TabbedArea');
const TabPane = require('ui/TabPane');

let dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./views/' + path);

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
    activeTab: React.PropTypes.string,
    views: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        view: React.PropTypes.string.isRequired,
        props: ImmutablePropTypes.map
      }))
  },

  getDefaultProps: function() {
    return {
      activeTab: 'view_0'
    };
  },

  icon() {
    return this.config.tables[this.props.table].icon;
  },

  title() {
    return `${this.config.tables[this.props.table].tableCapNameSingle} "${this.props.primKey}"`;
  },

  render() {
    let {table, primKey, componentUpdate, activeTab, views} = this.props;


    return (
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
    );

  }

});

module.exports = DataItem;

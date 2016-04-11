const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Sidebar = require('react-sidebar').default;
const SidebarHeader = require('ui/SidebarHeader');
const Icon = require('ui/Icon');
const PlotContainer = require('containers/PlotContainer');

const mui = require('material-ui');
const {FlatButton} = mui;


let GenomeBrowserWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      sidebar: true,
    };
  },

  componentWillMount() {
  },

  icon() {
    return 'bar-chart';
  },

  title() {
    return this.props.title || 'Plot';
  },

  render() {
    let actions = this.getFlux().actions;
    let {sidebar, componentUpdate, ...sub_props} = this.props;
    let sidebar_content = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>

      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebar_content}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">Plot</span>
          </div>
          <PlotContainer {...sub_props}
                         style = {{height: 'calc(100% - 40px)',
                                   width: '100%'}}
                         className="grow wtfdude"
                         componentUpdate={componentUpdate}
          />
        </div>
      </Sidebar>
    );
  }
});

module.exports = GenomeBrowserWithActions;

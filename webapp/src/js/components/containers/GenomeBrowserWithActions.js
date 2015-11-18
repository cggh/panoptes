const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Sidebar = require('react-sidebar');
const SidebarHeader = require('ui/SidebarHeader');
const Icon = require('ui/Icon');
const GenomeBrowser = require('panoptes/genome/GenomeBrowser');

const mui = require('material-ui');
const {FlatButton} = mui;


let GenomeBrowserWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    components: ImmutablePropTypes.orderedMap
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      sidebar: true,
      chromosome: '',
      start: 0,
      end:   10000,
      components: Immutable.OrderedMap()
    };
  },

  componentWillMount() {
  },

  icon() {
    return "bitmap:genomebrowser.png";
  },

  title() {
    return this.props.title || "Genome Browser";
  },

  render() {
    let actions = this.getFlux().actions;
    let {sidebar, componentUpdate, ...sub_props} = this.props;
    let sidebar_content = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>
        <FlatButton label="Add Channel"
                    primary={true}
                    onClick={null}/>

      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebar_content}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className='pointer icon'
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className='text'>WTF</span>
          </div>
          <GenomeBrowser componentUpdate={componentUpdate} sideWidth={100} {...sub_props} />
        </div>
      </Sidebar>
    );
  }
});

module.exports = GenomeBrowserWithActions;

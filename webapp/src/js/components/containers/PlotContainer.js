const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const Sidebar = require('react-sidebar');

const Plot = require("panoptes/Plot");

const PureRenderMixin = require('mixins/PureRenderMixin');


let PlotContainer = React.createClass({

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
  },

  getDefaultProps() {
    return {
      sidebar: true,
    };
  },

  render() {
    let { sidebar, style } = this.props;
    let sidebar_content = (
      <div className="sidebar">
      Hello
      </div>
    );
    return (
      <div style={Object.assign({position:'absolute'}, style || {})} >
        <Sidebar
          docked={sidebar}
          sidebar={sidebar_content}>
          <Plot/>
        </Sidebar>
      </div>
      );
  }
});

module.exports = PlotContainer;

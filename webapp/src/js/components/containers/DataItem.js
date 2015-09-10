const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Icon = require('ui/Icon');

let DataItem = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
  },

  icon() {
    return this.config.icon;
  },

  title() {
    return `${this.config.tableCapNameSingle}:${this.props.primKey}`;
  },

  render() {
    let {table, primKey, componentUpdate} = this.props;
    return <div>
      {`${this.config.tableCapNameSingle}:${this.props.primKey}`}
      </div>
  }
});

module.exports = DataItem;

const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');


let DataTableView = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, StoreWatchMixin('DataTableViewStore')],

  propTypes: {
    compId: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired
  },

  getStateFromFlux() {
    return this.getFlux().store('DataTableViewStore').getStateFor(this.props.compId).toObject()
  },

  componentDidMount: function() {
    this.getRowDataIfNeeded(this.props);
  },
  componentWillReceiveProps: function(nextProps) {
    this.getRowDataIfNeeded(nextProps);
  },
  getRowDataIfNeeded: function(props) {
    if(props.query !== this.state.query) {
      this.getFlux().actions.api.fetchTableData(props.compId, props.query);
    }
  },

  render() {
    let { query, ...other } = this.props;
    let rows = this.state.rows;
    return (
      <div {...other}>
        Hello World! {query}
        {rows}
      </div>
    );
  }

});

module.exports = DataTableView;

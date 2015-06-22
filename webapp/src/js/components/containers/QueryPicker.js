const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const SQL = require('panoptes/SQL');

const {RaisedButton} = require('material-ui');
const QueryString = require('ui/QueryString');

let QueryPicker = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, StoreWatchMixin('PanoptesStore')],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    onPick: React.PropTypes.func.isRequired,
    initialQuery: React.PropTypes.string
  },

  getStateFromFlux() {
    return {
      table_config: this.getFlux().store('PanoptesStore').getTable(this.props.table)
    }
  },

  getInitialState() {
    return {
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    }
  },

  componentDidMount() {
    if (this.props.initialQuery)
      this.setState({query: this.props.initialQuery});
    else {
      let defaultQuery = this.state.table_config.get('defaultQuery');
      if (defaultQuery && defaultQuery != '') {
        this.setState({query: defaultQuery});
      }
    }
  },

  icon() {
    return 'filter';
  },
  title() {
    return `Pick Filter for ${this.state.table_config.get('tableNamePlural')}`;
  },

  handlePick() {
    this.props.onPick(this.state.query);
  },

  render() {
    let {query, table_config} = this.state;
    return (
      <div className='large-modal'>
        <div className='hoizontal stack'>
          <div className='vertical stack'>
            <div className='red grow'>LIST</div>
            <div className='centering-container'>
              <QueryString className='text' prepend='' table={table_config} query={query}/>
            </div>
          </div>
          <div className='vertical stack'>
            <div className='green grow'>GRAPHICAL</div>
            <div className='centering-container'>
              <RaisedButton label="Use"
                          primary={true}
                          onClick={this.handlePick}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = QueryPicker;

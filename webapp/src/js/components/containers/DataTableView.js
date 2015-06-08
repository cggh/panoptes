const React = require('react');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

const API = require('panoptes/API');
const ErrorReport = require('panoptes/ErrorReporter');

const {Table, Column} = require('fixed-data-table');
const Loading = require('ui/Loading');
const ResizeDetect = require('utils/ResizeDetector');

let DataTableView = React.createClass({
  mixins: [PureRenderMixin, FluxMixin],

  propTypes: {
    compId: React.PropTypes.string.isRequired,
    dataset: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string
  },

  getInitialState: function () {
    return {
      rows: [],
      loadStatus: 'loaded',
      size: {
        width: 0,
        height: 0
      }
    };
  },

  componentDidMount() {
    this.getDataIfNeeded(this.props);
  },
  componentWillReceiveProps(nextProps) {
    this.getDataIfNeeded(nextProps);
  },
  getDataIfNeeded(nextProps) {
    if (nextProps.query !== this.state.query ||
      nextProps.order !== this.state.order)
      this.fetchData(nextProps);
  },

  fetchData(props) {
    this.setState({loadStatus: 'loading'});
    setTimeout(() => {
      API.pageQuery({
        database: props.dataset,
        table: props.table,
        columns: {SnpName: 'ST'}
      })
        .then((data) => {
          this.setState({loadStatus: 'loaded'});
          this.setState({rows: data});
        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });

    }, 2000);
  },

  render() {
    let { query, ...other } = this.props;
    let { loadStatus, rows, size } = this.state;
    return (
        <ResizeDetect className="datatable" onResize={(size) => this.setState({size:size})}>
            <Table
              rowHeight={50}
              rowGetter={(index) => rows[index]}
              rowsCount={rows.length}
              width={size.width}
              height={size.height}
              headerHeight={50}>
              <Column
                label="SnpName"
                width={100}
                dataKey="SnpName"
                />
            </Table>
            <Loading status={loadStatus}/>
        </ResizeDetect>
    );
  }

});

module.exports = DataTableView;

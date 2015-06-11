const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const shallowEquals = require('shallow-equals');
const classNames = require('classnames');
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
    dataset: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string,
    start: React.PropTypes.number,
    columns: ImmutablePropTypes.orderedMap.isRequired
  },

  getDefaultProps() {
    return {
      dataset: null,
      table: null,
      query: null,
      order: null,
      start: 0,
      columns: Immutable.OrderedMap()
    };
  },

  getInitialState() {
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
    this.getDataIfNeeded({}, this.props);
  },
  componentWillReceiveProps(nextProps) {
    this.getDataIfNeeded(this.props, nextProps);
  },
  getDataIfNeeded(lastProps, nextProps) {
    if (!shallowEquals(lastProps, nextProps))
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
    let { query, className } = this.props;
    let { loadStatus, rows, size } = this.state;
    return (
        <ResizeDetect className={classNames("datatable", className)} onResize={(size) => this.setState({size:size})}>
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

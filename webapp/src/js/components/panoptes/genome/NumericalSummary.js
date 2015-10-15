const React = require('react');
//const ReactDOM = require('react-dom');
//const ReactElement = require('react/lib/ReactElement');
//const ReactElementValidator = require('react/lib/ReactElementValidator');
//const SVGDOMPropertyConfig = require('react/lib/SVGDOMPropertyConfig');
//const DOMProperty = require('react/lib/DOMProperty');
//const MUST_USE_ATTRIBUTE = DOMProperty.injection.MUST_USE_ATTRIBUTE;
//let createFactory = () => {
//  if (process.env.NODE_ENV !== 'production')
//    return ReactElementValidator.createFactory;
//  else
//    return ReactElement.createFactory;
//};
//
//SVGDOMPropertyConfig.Properties.vectorEffect = MUST_USE_ATTRIBUTE;
//ReactDOM.vectorEffect = createFactory('vectorEffect');



const PureRenderMixin = require('mixins/PureRenderMixin');
const d3 = require('d3');
const Immutable = require('immutable');
const uid = require('uid');

const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');
const FluxMixin = require('mixins/FluxMixin');

const SummarisationCache = require('panoptes/SummarisationCache');
const ErrorReport = require('panoptes/ErrorReporter');
const API = require('panoptes/API');

const HEIGHT= 100;


let NumericalSummary = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.id = uid(10);
  },

  applyData(data) {
    this.setState(data)
  },

  //Called by DataFetcherMixin on prop change
  fetchData(props) {
    let {chromosome, start, end, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome))
      this.setState({columns: null});
    if (width - sideWidth < 1) {
      return;
    }
    let [data, promise] = SummarisationCache.fetch({
      columns: {
        avg: {
          folder: `SummaryTracks/${this.config.dataset}/Uniqueness`,
          config: 'Summ',
          name: 'Uniqueness_avg'
        }
      },
      minBlockSize: 80,
      chromosome: chromosome,
      start: start,
      end: end,
      targetPointCount: (width - sideWidth) / 2,
      invalidationID: this.id
    });
    if (data)
      this.applyData(data);
    if (promise) {
      this.props.onChangeLoadStatus('LOADING');
      promise
        .then((data) => {
          this.props.onChangeLoadStatus('DONE');
          this.applyData(data);
        })
        .catch((data) => {
          this.props.onChangeLoadStatus('DONE');
          if (data !== 'SUPERSEDED') {
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
            this.setState({loadStatus: 'error'});
          }
        });
    }
  },

  render() {
    let { start, end, width, sideWidth, ...other } = this.props;
    let { dataStart, dataStep, columns} = this.state;
    let avg = columns ? columns.avg || [] : [];
    if (width == 0)
      return null;
    let scale = d3.scale.linear().domain([start, end]).range([0, width-sideWidth]);
    let stepWidth = scale(dataStep) - scale(0);
    let offset = scale(dataStart) - scale(start);
    let line = d3.svg.line().x((d,i) => i).y((d,i) => d/500)(avg);
    return (
      <div className="channel" style={{height:HEIGHT}}>
        <div className="channel-side" style={{width:`${sideWidth}px`}}> YOLO </div>
        <div className="channel-data" style={{width:`${width-sideWidth}px`}} >
          <svg className="numerical-summary" width={width-sideWidth} height={HEIGHT}>
            <g style={{transform:`translateX(${offset}px) scale(${stepWidth},${HEIGHT})`}}>
              {
                <path vector-effect="non-scaling-stroke" d={line}/>
            }
            </g>
          </svg>
        </div>

      </div>
    );
  }

});

module.exports = NumericalSummary;



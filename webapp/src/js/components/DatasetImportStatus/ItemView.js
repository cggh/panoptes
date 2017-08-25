import PropTypes from 'prop-types';
import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';

// Utils
import RequestContext from 'util/RequestContext';
import LRUCache from 'util/LRUCache';

// UI components
import Loading from 'ui/Loading';

let DatasetImportStatusItemView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    logId: PropTypes.string.isRequired,
    title: PropTypes.string,
    icon: PropTypes.string
  },

  getInitialState() {
    return {
      logContent: null,
      loadStatus: 'loaded'
    };
  },

  title() {
    return this.props.title;
  },

  icon() {
    return this.props.icon;
  },

  componentWillMount() {
    this._requestContext = new RequestContext();
    this.fetchData(this.props, this._requestContext);
  },

  componentWillUnmount() {
    this._requestContext.destroy();
  },

  // *Not* called by DataFetcherMixin
  fetchData(props, requestContext) {
    this.setState({loadStatus: 'loading'});
    let APIargs = {
      logId: this.props.logId
    };
    requestContext.request((componentCancellation) =>
        API.fetchImportStatusLog({cancellation: componentCancellation, ...APIargs}),
      )
      .then((data) => {
        this.setState({
          loadStatus: 'loaded',
          logContent: data
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error'});
      });
  },

  render: function() {

    let {loadStatus, logContent} = this.state;

    return (
      <div style={{minHeight: '200px'}}>
        <div style={{padding: '10px', whiteSpace: 'pre-wrap', maxWidth: '80vw', maxHeight: '80vh'}}>{logContent}</div>
        <Loading status={loadStatus}/>
      </div>
    );

  }

});

export default DatasetImportStatusItemView;

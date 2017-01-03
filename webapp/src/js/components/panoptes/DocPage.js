import React from 'react';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import htmlparser from 'htmlparser2';
import Loading from 'ui/Loading';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

let DocPage = React.createClass({
  mixins: [
    ConfigMixin,
    PureRenderMixin,
    FluxMixin,
    DataFetcherMixin('path')
  ],

  getInitialState() {
    return {
      content: '',
      loadStatus: 'loading'
    };
  },

  propTypes: {
    path: React.PropTypes.string,
    replaceSelf: React.PropTypes.func,
    updateTitleIcon: React.PropTypes.func,
    replaceable: React.PropTypes.bool
  },

  componentWillMount() {
    this.titleFromHTML = 'Loading...';
  },

  fetchData(props, requestContext) {
    const {path} = props;
    if (path !== this.props.path) {
      this.titleFromHTML = 'Loading...';
      this.setState(this.getInitialState());
    }
    if (this.config.docs[path]) {
      this.setState({loadStatus: 'loaded', content: this.config.docs[path]}, () => this.componentWillUpdate(props, this.state));
      return;
    }
    const {dataset} = this.config;
    requestContext.request((componentCancellation) =>
      LRUCache.get(
        'staticContent' + path,
        (cacheCancellation) =>
          API.staticContent({cancellation: cacheCancellation, url: `/panoptes/Docs/${dataset}/${path}`}),
        componentCancellation
      )
    )
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .then((content) => this.setState({loadStatus: 'loaded', content}))
      .catch((error) => {
        this.setState({loadStatus: 'error', content: ''});
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(this.props, requestContext));
        console.error(error);
        throw error;
      })
      .done();
  },

  componentWillUpdate(nextProps, nextState) {
    let inTitle = false;
    let title = 'Untitled';
    const parser = new htmlparser.Parser({
      onopentag: function(tagname, attribs) {
        if (tagname === 'title') {
          inTitle = true;
        }
      },
      ontext: function(text) {
        if (inTitle) {
          title = text;
        }
      },
      onclosetag: function(tagname) {
        if (tagname === 'title') {
          inTitle = false;
        }
      }
    }, {decodeEntities: true});
    parser.write(nextState.content);
    parser.end();
    if (title !== this.titleFromHTML) {
      this.titleFromHTML = title;
      if (nextProps.updateTitleIcon) {
        nextProps.updateTitleIcon();
      }
    }
  },

  title() {
    return this.titleFromHTML;
  },
  icon() {
    return 'file-text-o';
  },

  render() {
    const {content, loadStatus} = this.state;
    const replaceSelf = this.props.replaceable ? this.props.replaceSelf : undefined;

    return <div className="load-container">
      <HTMLWithComponents replaceSelf={replaceSelf}>{content}</HTMLWithComponents>
      <Loading status={loadStatus}/>
    </div>;
  }

});

export default DocPage;

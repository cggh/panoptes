import React from 'react';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import {Editor, EditorState, ContentState, convertFromRaw, convertToRaw} from 'draft-js';
import PrismDecorator from  'draft-js-prism';
import ErrorReport from 'panoptes/ErrorReporter';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import Loading from 'ui/Loading';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import Icon from 'ui/Icon';

import 'prismjs/themes/prism.css'
import 'draft-js/dist/Draft.css'

const decorator = new PrismDecorator({defaultSyntax: 'markup'});

let EditDocPage = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('path')
  ],

  getInitialState() {
    return {
      loadStatus: 'loading',
      editorState: EditorState.createEmpty(decorator),
      content: ''
    };
  },

  propTypes: {
    path: React.PropTypes.string.isRequired
  },

  icon() {
    return 'edit';
  },
  title() {
    return `Editing ${this.props.path}`;
  },

  setContent(content) {
    var contentState = convertFromRaw({
      entityMap: {},
      blocks: [
        {
          type: 'code-block',
          text: content
        }
      ]
    });

    this.setState({
      content,
      editorState: EditorState.createWithContent(contentState)//, decorator) Fix needed in prism
    });
  },

  fetchData(props, requestContext) {
    const {path} = props;
    if (path === this.loadedPath) {
      return;
    }
    if (this.config.docs[path]) {
      this.setState({loadStatus: 'loaded'});
      this.setContent(this.config.docs[path]);
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
      .then((content) => {
        this.setState({loadStatus: 'loaded'});
        this.setContent(content);
        this.loadedPath = path;
      })
      .catch((error) => {
        this.setState({loadStatus: 'error'});
        this.setContent('');
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(this.props, requestContext));
        console.error(error);
        throw error;
      })
      .done();
  },

  handleChange(editorState) {
    this.setState({editorState, content: editorState.getCurrentContent().getPlainText()});
  },

  render() {
    const {editorState, content, loadStatus} = this.state;
    const actions = this.getFlux().actions;

    return <div className="large-modal edit-doc-page">
      <div className="load-container vertical stack">
        <div className="editor grow scroll-within">
          <Editor className="editor"
                  editorState={editorState}
                  onChange={this.handleChange}
                  placeholder="Loading..."
                  ref="editor"
          />
        </div>
        <div className="centering-container">
          <FlatButton
            label="Cancel"
            primary={false}
            onClick={() => actions.session.modalClose()}
          />
          <RaisedButton
            label="Save"
            primary={true}
            icon={<Icon fixedWidth={true} name={'save'} inverse={true} />}
            onClick={() =>  {
              this.getFlux().actions.api.modifyConfig({
                dataset: this.config.dataset,
                path: `docs.${this.props.path}`,
                action: 'replace',
                content: content
              });
              actions.session.modalClose()
            }}
          />
        </div>
        <Loading status={loadStatus}/>
      </div>
    </div>;
  }
});

export default EditDocPage;

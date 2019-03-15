import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import {Editor, EditorState, ContentState, convertFromRaw, convertToRaw} from 'draft-js';
import PrismDecorator from  'draft-js-prism';
import ErrorReport from 'panoptes/ErrorReporter';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import Loading from 'ui/Loading';
import Button from 'ui/Button';
import Icon from 'ui/Icon';
import customHandlebars from 'util/customHandlebars';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import _debounce from 'lodash.debounce';
import ErrorBoundary from 'components/ErrorBoundary';

import 'prismjs/themes/prism.css';
import 'draft-js/dist/Draft.css';

const decorator = new PrismDecorator({defaultSyntax: 'markup'});

let EditDocPage = createReactClass({
  displayName: 'EditDocPage',

  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('path')
  ],

  getInitialState() {
    return {
      loadStatus: 'loading',
      editorState: EditorState.createEmpty(decorator),
      content: '',
      rendered: '....loading preview'
    };
  },

  propTypes: {
    path: PropTypes.string.isRequired
  },

  icon() {
    return 'edit';
  },

  title() {
    return `Editing ${this.props.path}`;
  },

  componentWillMount() {
    this.handlebars = customHandlebars(this.config);
    this.debouncedPreviewUpdate = _debounce(this.previewUpdate, 1000);
  },

  onConfigChange() {
    this.handlebars = customHandlebars(this.config);
  },

  setContent(content) {
    let contentState = convertFromRaw({
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
      editorState: EditorState.createWithContent(contentState, decorator)
    });
    this.previewUpdate(content);
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
        `staticContent${path}`,
        (cacheCancellation) =>
          API.staticContent({cancellation: cacheCancellation, url: `${process.env.DATASET_URL_PATH_PREFIX}/panoptes/Docs/${dataset}/${path}`}),
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

  previewUpdate(content) {
    try {
      let template = this.handlebars.compile(content);
      template({config: this.config})
        .then((rendered) => this.setState({rendered}))
        .catch((error) => {
          this.setState({rendered: `Error ${error.message || error.statusText}`});
        });
    } catch (error) {
      this.setState({rendered: `Error ${error.message}`});
    }
  },

  handleChange(editorState) {
    let content = editorState.getCurrentContent().getPlainText();
    this.setState({editorState, content});
    if (content !== this.state.content) {
      this.debouncedPreviewUpdate(content);
    }
  },

  render() {
    const {editorState, content, loadStatus, rendered} = this.state;
    const actions = this.getFlux().actions;

    return (
      <div className="large-modal edit-doc-page">
        <div className="load-container vertical stack">
          <div className="grow horizontal stack">
            <div className="editor scroll-within">
              <Editor className="editor"
                editorState={editorState}
                onChange={this.handleChange}
                placeholder="Loading..."
                ref="editor"
              />
            </div>
            <div className="preview scroll-within">
              <ErrorBoundary><HTMLWithComponents>{rendered}</HTMLWithComponents></ErrorBoundary>
            </div>
          </div>
          <div className="centering-container">
            <Button
              label="Cancel"
              onClick={() => actions.session.modalClose()}
            />
            <Button
              raised="true"
              label="Save"
              color="primary"
              iconName="save"
              iconInverse={true}
              onClick={() =>  {
                this.getFlux().actions.api.modifyConfig({
                  dataset: this.config.dataset,
                  path: `docs.${this.props.path}`,
                  action: 'replace',
                  content
                });
                actions.session.modalClose();
              }}
            />
          </div>
          <Loading status={loadStatus}/>
        </div>
      </div>
    );
  },
});

export default EditDocPage;

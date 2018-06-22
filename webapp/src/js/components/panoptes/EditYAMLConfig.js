import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import {Editor, EditorState, ContentState, convertFromRaw, convertToRaw} from 'draft-js';
import PrismDecorator from  'draft-js-prism';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';
import 'draft-js/dist/Draft.css';
import Button from 'ui/Button';
import Icon from 'ui/Icon';

// const decorator = new PrismDecorator({defaultSyntax: 'yaml'});

let EditYAMLConfig = createReactClass({
  displayName: 'EditYAMLConfig',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    path: PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      loadStatus: 'loading',
      editorState: EditorState.createEmpty(/*decorator*/),
      content: ''
    };
  },

  componentWillMount() {
    let {path} = this.props;
    let yaml = path.split('.').reduce((o, i) => o[i], this.config)._yaml;
    let contentState = convertFromRaw({
      entityMap: {},
      blocks: [
        {
          type: 'code-block',
          text: yaml
        }
      ]
    });
    this.setState({
      content: yaml,
      editorState: EditorState.createWithContent(contentState /*, decorator */)
    });
  },

  icon() {
    return 'edit';
  },

  title() {
    return `Editing ${this.props.path} settings`;
  },

  handleChange(editorState) {
    this.setState({editorState, content: editorState.getCurrentContent().getPlainText()});
  },

  render() {
    const {editorState, content} = this.state;
    const actions = this.getFlux().actions;
    const loading = this.config.loadStatus == 'LOADING';
    return (
      <div className="large-modal edit-doc-page">
        <div className="load-container vertical stack">
          <div className="editor grow scroll-within">
            <Editor className="editor"
              editorState={editorState}
              onChange={this.handleChange}
              placeholder=""
              ref="editor"
            />
          </div>
          <div className="centering-container">
            <Button
              label="Close"
              color="primary"
              onClick={() => actions.session.modalClose()}
            />
            <Button
              raised="true"
              label="Save"
              color="primary"
              disabled={loading}
              icon={<Icon fixedWidth={true} name={loading ? 'spinner' : 'save'} spin={loading} inverse={true} />}
              onClick={() =>  {
                this.getFlux().actions.api.replaceYAMLConfig({
                  dataset: this.config.dataset,
                  path: `${this.props.path}`,
                  content,
                  onSuccess: () => actions.session.modalClose()
                });
              }}
            />
          </div>
        </div>
      </div>
    );
  },
});

export default EditYAMLConfig;

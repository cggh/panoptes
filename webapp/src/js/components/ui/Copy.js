import PropTypes from 'prop-types';
import React from 'react';


import createReactClass from 'create-react-class';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// UI
import Icon from 'ui/Icon';

// Material UI
import Button from 'ui/Button';

// Credit: http://stackoverflow.com/users/7173/jason
function selectText(element) {
  let doc = document, text = doc.getElementById(element), range, selection;
  if (doc.body.createTextRange) {
    range = document.body.createTextRange();
    range.moveToElementText(text);
    range.select();
  } else if (window.getSelection) {
    selection = window.getSelection();
    range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

let Copy = createReactClass({
  displayName: 'Copy',
  mixins: [PureRenderMixin, FluxMixin],

  propTypes: {
    title: PropTypes.string,
    introContent: PropTypes.string,
    selectedContent: PropTypes.string.isRequired,
    OKButtonLabel: PropTypes.string,
    onOK: PropTypes.func
  },

  getDefaultProps() {
    return {
      introContent: '',
      selectedContent: '',
      title: '',
      OKButtonLabel: 'OK',
      onOK() {}
    };
  },

  componentDidMount() {
    selectText('selectedContent');
  },

  title() {
    return this.props.title;
  },

  icon() {
    return 'paste';
  },

  handleOK() {
    this.props.onOK();
    this.getFlux().actions.session.modalClose();
  },

  render() {
    let {introContent, selectedContent, OKButtonLabel} = this.props;

    return (
      <div style={{padding: '10px', maxWidth: '80vw'}}>
        <div style={{padding: '10px'}}>{introContent}</div>
        <div style={{padding: '10px'}} id="selectedContent">{selectedContent}</div>
        <div style={{padding: '5px 0 0 0', textAlign: 'center'}}>
          <Button
            raised="true"
            style={{marginRight: '10px'}}
            label={OKButtonLabel}
            color="primary"
            iconName="check"
            iconInverse={true}
            onClick={this.handleOK}
          />
        </div>
      </div>
    );
  },
});

export default Copy;

import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';


let ExternalLinkButton = createReactClass({
  displayName: 'ExternalLinkButton',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    label: PropTypes.string,
    urls: PropTypes.array
  },

  handleClick(e) {
    this.props.urls.forEach((url) => window.open(url, '_blank'));
  },

  render() {
    const {label} = this.props;

    return <RaisedButton
      style={{margin: '7px', color: 'white'}}
      label={label}
      primary={true}
      icon={<Icon name="external-link" />}
      labelStyle={{textTransform: 'inherit'}}
      onClick={this.handleClick}
    />;
  },
});

export default ExternalLinkButton;

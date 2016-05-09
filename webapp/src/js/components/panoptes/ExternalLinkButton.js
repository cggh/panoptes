import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';


let ExternalLinkButton = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    urls: React.PropTypes.array
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
  }

});

export default ExternalLinkButton;

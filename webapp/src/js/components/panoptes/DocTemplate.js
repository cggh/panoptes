import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import withAPIData from 'hoc/withAPIData';
import FluxMixin from 'mixins/FluxMixin'; // Need this?
import ConfigMixin from 'mixins/ConfigMixin'; // Need this?
import HandlebarsWithComponents from 'panoptes/HandlebarsWithComponents';

let DocTemplate = createReactClass({
  displayName: 'DocTemplate',

  mixins: [
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    path: PropTypes.string,
    template: PropTypes.string, // This will be provided via withAPIData
  },

  render() {
    const {template, ...otherProps} = this.props;
    return template === undefined ? null : React.createElement(HandlebarsWithComponents, otherProps, template);
  }
});

DocTemplate = withAPIData(DocTemplate, function({props}) {
  return {
    requests: {
      template: {
        method: 'staticContent',
        args: {
          url: `/panoptes/Docs/${this.config.dataset}/${props.path}`
        },
      },
    },
  };
});

export default DocTemplate;

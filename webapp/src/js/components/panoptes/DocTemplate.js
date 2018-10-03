import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import withAPIData from 'hoc/withAPIData';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import HandlebarsWithComponents from 'panoptes/HandlebarsWithComponents';
import IconButton from '@material-ui/core/IconButton';
import EditDocPage from 'panoptes/EditDocPage';

let DocTemplate = createReactClass({
  displayName: 'DocTemplate',

  mixins: [
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    path: PropTypes.string,
    template: PropTypes.string, // This will be provided via withAPIData
    hideEditButton: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      hideEditButton: false,
    };
  },

  render() {
    const {path, template, hideEditButton, ...otherProps} = this.props;
    // NOTE: z-index of the Edit modal is currently set to 9997.
    const editButtonZIndex = 9996;
    return [ this.config.user.isManager && hideEditButton == false ?
          <IconButton
            key='icon'
            aria-label="Edit"
            className="fa fa-edit"
            onClick={() => this.getFlux().actions.session.modalOpen(<EditDocPage path={path}/>)}
            style={{position: 'absolute', left: '0', right: '0', margin: 'auto', zIndex: editButtonZIndex}}
          />
          : null,
    template === undefined ? null : React.createElement(HandlebarsWithComponents, {key: 'template', ...otherProps}, template)];
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

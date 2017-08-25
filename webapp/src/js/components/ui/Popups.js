import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ValidComponentChildren from 'util/ValidComponentChildren';
import PureRenderMixin from 'mixins/PureRenderMixin';

let Popups = createReactClass({
  displayName: 'Popups',
  mixins: [PureRenderMixin],

  propTypes: {
    children: PropTypes.node
  },

  renderPopup(popup) {
    return popup;
  },

  render() {
    return (
      <div {...this.props} className="popups">
          {ValidComponentChildren.map(this.props.children, this.renderPopup, this)}
      </div>
    );
  },
});

export default Popups;

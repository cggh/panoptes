import PropTypes from 'prop-types';
import React from 'react';
import ValidComponentChildren from 'util/ValidComponentChildren';
import PureRenderMixin from 'mixins/PureRenderMixin';

let Popups = React.createClass({
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
  }

});

export default Popups;

import React from 'react';
import ValidComponentChildren from '../utils/ValidComponentChildren';
import PureRenderMixin from 'mixins/PureRenderMixin';

let Popups = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
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

module.exports = Popups;

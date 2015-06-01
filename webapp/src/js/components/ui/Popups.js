const React = require('react');
const ValidComponentChildren = require('../utils/ValidComponentChildren');
const classNames = require('classnames');
const PureRenderMixin = require('mixins/PureRenderMixin');

let Popups = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
  },

  renderPopup(popup) {
    return popup
  },

  render() {
    return (
      <div {...this.props} className="popups">
          {ValidComponentChildren.map(this.props.children, this.renderPopup, this)}
      </div>
    )
  }

});

module.exports = Popups;

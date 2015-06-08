const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

let Loading = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    status: React.PropTypes.string.isRequired
  },

  render() {
    let { status, ...other } = this.props;
    if (status == 'loading')
      return (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      );

    if (status == 'error')
      return (
        <div className="loading-container">
          <div className="error" />
        </div>
      );

    return (
      <div className="loading-container loaded">
        <div className="spinner" />
      </div>
    );

  }

});

module.exports = Loading;

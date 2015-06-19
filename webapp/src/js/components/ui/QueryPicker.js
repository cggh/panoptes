const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

let QueryPicker = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    msg: React.PropTypes.string.isRequired
  },

  icon() {
    return 'filter';
  },
  title() {
    return 'Pick Query';
  },

  render() {
    let { msg, ...other } = this.props;
    return (
      <div {...other}>
        Hello World! {msg}
      </div>
    );
  }

});

module.exports = QueryPicker;

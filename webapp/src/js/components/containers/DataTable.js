const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

let DataTable = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    query: React.PropTypes.string.isRequired
  },

  render() {
    let { query, ...other } = this.props;
    return (
      <div {...other}>
        Hello World! {query}
      </div>
    );
  }

});

module.exports = DataTable;

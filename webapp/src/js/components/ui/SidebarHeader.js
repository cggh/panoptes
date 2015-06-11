const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const Icon = require('ui/Icon');

let SidebarHeader = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    icon: React.PropTypes.string.isRequired,
    description: React.PropTypes.string.isRequired
  },

  render() {
    let { icon, description } = this.props;
    return (
      <div className="sidebar-header">
        <div className="icon">
          <Icon name={icon}/>
        </div>
        <span className="description">
           {description}
        </span>
       </div>
    );
  }
});

module.exports = SidebarHeader;

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
        <div className="icon-holder">
          <Icon name={icon}/>
        </div>
        <span className="description">
           {description}
        </span>
        <div style={ {clear: 'both'} }/>
      </div>


    );
  }
});

module.exports = SidebarHeader;

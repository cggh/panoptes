import PropTypes from 'prop-types';
import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';

let SidebarHeader = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    icon: PropTypes.string.isRequired,
    description: PropTypes.node
  },

  render() {
    let {icon, description} = this.props;
    return (
      <div className="sidebar-header">
        <div className="icon-holder">
          <Icon name={icon}/>
        </div>
        <span className="description">
           {description || <i>No description</i>}
        </span>
        <div style={ {clear: 'both'} }/>
      </div>


    );
  }
});

export default SidebarHeader;

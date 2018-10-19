import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';

let SidebarHeader = createReactClass({
  displayName: 'SidebarHeader',
  mixins: [PureRenderMixin],

  propTypes: {
    icon: PropTypes.string.isRequired,
    description: PropTypes.node
  },

  render() {
    let {icon, description} = this.props;
    // TODO test: description = null;
    return (
      <div className="sidebar-header">
        <div className="icon-holder">
          <Icon name={icon}/>
        </div>
        <div className="description">
          {description}
        </div>
      </div>
    );
  },
});

export default SidebarHeader;

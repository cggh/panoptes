import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';

import Icon from 'ui/Icon';

let GeneFinder = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      title: 'Find gene',
      icon: 'bitmap:genomebrowser.png'
    };
  },

  icon() {
    return this.props.icon;
  },
  title() {
    return this.props.title;
  },

  handleClick({container, props, middleClick}) {
    this.getFlux().actions.session.modalClose();
    this.getFlux().actions.session.modalOpen('containers/GeneFinder', {});
  },

  render() {
    return (
      <List>
        <ListItem primaryText="Search by name or description"
                  leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                  onClick={this.handleClick}
        />
        <ListItem primaryText="Search by genomic region"
                  leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                  onClick={this.handleClick}
        />
      </List>
    );
  }
});

module.exports = GeneFinder;

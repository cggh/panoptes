import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';

import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';
import Subheader from 'material-ui/lib/Subheader';
import Icon from 'ui/Icon';

let ViewList = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    style: React.PropTypes.object,
    onClick: React.PropTypes.func.isRequired
  },


  handleOpen(e, container, props) {
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    this.props.onClick({container, props, middleClick});
  },


  render() {
    return (
        <List style={this.props.style}>
          <Subheader>Open a view:</Subheader>
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/GenomeBrowserWithActions', {})} />
          <ListItem primaryText="Plot"
                    secondaryText="View table data graphically"
                    leftIcon={<div><Icon fixedWidth={true} name="area-chart "/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/PlotWithActions', {})} />
        </List>
    );
  }
});

module.exports = ViewList;

import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';
import Subheader from 'material-ui/lib/Subheader';
import RaisedButton from 'material-ui/lib/raised-button';

import Icon from 'ui/Icon';

let GeneFinder = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      title: 'Find gene',
      icon: 'bitmap:genomebrowser.png',
      initialPane: null
    };
  },

  getInitialState() {
    return {
      pane: this.props.initialPane
    };
  },

  icon() {
    return this.props.icon;
  },
  title() {
    return this.props.title;
  },

  handleSwitchPane(container, props) {

    this.setState(props);

  },

  render() {

    let {pane} = this.state;

    let geneFinderContent = null;

    if (pane === null) {

      geneFinderContent = (
        <List>
          <Subheader>Search by:</Subheader>
          <ListItem primaryText="Gene name / description"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                    onClick={() => this.handleSwitchPane('containers/GeneFinder', {pane: 'search by name or description'})}
          />
          <ListItem primaryText="Genomic region"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                    onClick={() => this.handleSwitchPane('containers/GeneFinder', {pane: 'search by genomic region'})}
          />
        </List>
      );

    } else if (pane === 'search by name or description') {

      geneFinderContent = (
        <div>
          <div className="centering-container">
            <p>search by name or description</p>
          </div>
          <div className="centering-container">
            <RaisedButton label={<span>Start again</span>}
                          primary={true}
                          onClick={() => this.handleSwitchPane('containers/GeneFinder', {pane: null})}
            />
          </div>
        </div>
      );

    } else {
      console.error('Unhandled pane: ' + pane);
      geneFinderContent = (
        <div>
          <div className="centering-container">
            <p>Error: Unhandled pane</p>
          </div>
          <div className="centering-container">
            <RaisedButton label={<span>Start again</span>}
                          primary={true}
                          onClick={() => this.handleSwitchPane('containers/GeneFinder', {pane: null})}
            />
          </div>
        </div>
      );
    }

    return geneFinderContent;
  }
});

module.exports = GeneFinder;

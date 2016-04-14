import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';

import Icon from 'ui/Icon';

// lodash
import _keys from 'lodash/keys';

let Finder = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  getDefaultProps() {
    return {
      title: 'Find',
      icon: 'search'
    };
  },

  icon() {
    return this.props.icon;
  },
  title() {
    return this.props.title;
  },

  handleSwitchModal(container, props) {
    this.getFlux().actions.session.modalClose();
    this.getFlux().actions.session.modalOpen(container, props);
  },

  render() {

    // TODO: A vertical list is not entirely scalable (modal dialog would go off screen).

    let listItems = [];

    if (this.config.settings.hasGenomeBrowser) {

      let listItem = (
        <ListItem key="geneFinderListItem"
                  primaryText="Gene"
                  leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                  onClick={() => this.handleSwitchModal('containers/GeneFinder', {})}
        />
      );

      listItems.push(listItem);
    }

    if (_keys(this.config.tables).length > 0) {

      let tables = this.config.tables;

      // TODO: Only show tables that should be shown here. Determined by what?
console.log('this.config: %o', this.config);

      for (let table in tables) {

        let listItem = (
          <ListItem key={tables[table].id}
                    primaryText={tables[table].tableCapNameSingle}
                    leftIcon={<div><Icon fixedWidth={true} name={tables[table].icon} /></div>}
                    onClick={() => this.handleSwitchModal('containers/DatumFinder', {table: table})}
          />
        );

        listItems.push(listItem);
      }

    }

    let finderContent = null;

    if (listItems.length > 0) {
      finderContent = (
        <List>
          {listItems}
        </List>
      );
    } else {

      // TODO: Would be better to also disable the Find button.

      finderContent = (
        <div className="centering-container">
          No search wizards available.
        </div>
      );
    }

    return finderContent;
  }
});

module.exports = Finder;

import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';

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

  handleOpenTableTab(e, table) {

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (!middleClick) {
      this.getFlux().actions.session.modalClose();
    }

    let container = 'containers/DataTableWithActions';
    if (this.config.tables[table.id].settings.listView) {
      container = 'containers/ListWithActions';
    }

    let switchTo = !middleClick;
    this.getFlux().actions.session.tabOpen(container, {table: table.id, initialSearchFocus: true}, switchTo);
  },

  handleOpenPopup(e, container, props) {

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (!middleClick) {
      this.getFlux().actions.session.modalClose();
    }

    let switchTo = !middleClick;
    this.getFlux().actions.session.popupOpen(container, props, switchTo);
  },

  render() {

    let listItems = [];

    if (this.config.settings.hasGenomeBrowser) {

      // TODO: not sure whether exposing these setting values (GeneNameAttribute, GeneDescriptionAttribute) is wise
      // let annotationSettings = JSON.parse(this.config.settings.annotation);
      // let secondaryText = annotationSettings['GeneNameAttribute'] + ', ' + annotationSettings['GeneDescriptionAttribute'] + ', Genomic region';
      let secondaryText = 'Name, Description, Genomic region';

      let listItem = (
        <ListItem key="findGeneListItem"
                  primaryText="Gene"
                  secondaryText={secondaryText}
                  leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png" /></div>}
                  onClick={(e) => this.handleOpenPopup(e, 'containers/FindGene', {})}
        />
      );

      listItems.push(listItem);
    }

    if (_keys(this.config.tables).length > 0) {

      let tables = this.config.tables;

      // TODO: Only show tables / fields that should be shown here. Determined by what?

      // http://panoptes.readthedocs.org/en/pn1.6.2/importdata/importsettings/datatable.html?highlight=quickfindfields
      // e.g. this.config.tables['populations'].quickFindFields[0] === "ID"
      // "The list of properties will be used by some tools in the software that allow the user to quickly find a (set of) item(s)."

      // http://panoptes.readthedocs.org/en/pn1.6.2/importdata/importsettings/datatable_properties.html?highlight=search
      // e.g. this.config.tables['variants'].propertiesMap['chromosome'].settings['Search'] === "None"
      // "Indicates that this field can be used for text search in the find data item wizard."

      // http://panoptes.readthedocs.org/en/pn1.6.2/importdata/importsettings/datatable.html?highlight=ishidden
      // e.g. this.config.tables['populations'].settings.isHidden === true
      // "If set to true, the data table will not be displayed as a standalone entity (i.e. not mentioned on the intro page and no tab)."

      for (let table in tables) {

        if (this.config.tables[table].settings.isHidden) continue;

        let secondaryText = '';
        for (let i = 0, len = this.config.tables[table].quickFindFields.length; i < len; i++) {

          let quickFindField = this.config.tables[table].quickFindFields[i];
          if (i != 0) secondaryText += ', ';
          secondaryText += this.config.tables[table].propertiesMap[quickFindField].name;

        }

        let listItem = (
          <ListItem key={tables[table].id}
                    primaryText={tables[table].tableCapNameSingle}
                    secondaryText={secondaryText}
                    leftIcon={<div><Icon fixedWidth={true} name={tables[table].icon} /></div>}
                    onClick={(e) => this.handleOpenTableTab(e, tables[table])}
          />
        );

        listItems.push(listItem);
      }

    }

    let finderContent = null;

    if (listItems.length > 0) {
      finderContent = (
        <List className="tall-modal" style={{overflow: 'auto'}}>
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

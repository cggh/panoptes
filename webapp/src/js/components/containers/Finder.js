import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';

import Icon from 'ui/Icon';

// lodash
import _forEach from 'lodash/forEach';

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
    if (this.config.tablesById[table.id].listView) {
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

    if (this.config.hasGenomeBrowser) {

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


    // TODO:
    // http://panoptes.readthedocs.org/en/pn1.6.2/importdata/importsettings/datatable_properties.html?highlight=search
    // e.g. this.config.tablesById['variants'].propertiesById['chromosome']['Search'] === "None"
    // "Indicates that this field can be used for text search in the find data item wizard."

    _forEach(this.config.visibleTables, (table) => {

      // Only list fields that are specified in quickFindFields.
      let secondaryText = '';
      for (let i = 0, len = table.quickFindFields.length; i < len; i++) {

        let quickFindField = table.quickFindFields[i];
        if (i != 0) secondaryText += ', ';
        secondaryText += table.propertiesById[quickFindField].name;

      }

      let listItem = (
        <ListItem key={table.id}
                  primaryText={table.capNameSingle}
                  secondaryText={secondaryText}
                  leftIcon={<div><Icon fixedWidth={true} name={table.icon} /></div>}
                  onClick={(e) => this.handleOpenTableTab(e, table.id)}
        />
      );

      listItems.push(listItem);
    });

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

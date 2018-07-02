import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _forEach from 'lodash.foreach';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import Icon from 'ui/Icon';
import DataTableWithActions from 'containers/DataTableWithActions';
import ListWithActions from 'containers/ListWithActions';
import FindGene from 'containers/FindGene';

let Finder = createReactClass({
  displayName: 'Finder',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    icon: PropTypes.string,
    title: PropTypes.string,
  },

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

  handleOpenTableTab(e, table) {

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (!middleClick) {
      this.getFlux().actions.session.modalClose();
    }

    let switchTo = !middleClick;

    if (this.config.tablesById[table].listView) {
      this.getFlux().actions.session.tabOpen(<ListWithActions table={table} initialSearchFocus={true} />, switchTo);
    } else {
      this.getFlux().actions.session.tabOpen(<DataTableWithActions table={table} initialSearchFocus={true} />, switchTo);
    }
  },

  handleOpenPopup(e, component) {

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (!middleClick) {
      this.getFlux().actions.session.modalClose();
    }

    let switchTo = !middleClick;
    this.getFlux().actions.session.popupOpen(component, switchTo);
  },

  render() {

    let listItems = [];

    if (this.config.genome.annotation) {

      let secondaryText = 'Name, Description, Genomic region';

      let listItem = (
        <ListItem
          button
          key="findGeneListItem"
          onClick={(e) => this.handleOpenPopup(e, <FindGene />)}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name="bitmap:genomebrowser.png" />
          </ListItemIcon>
          <ListItemText
            primary="Gene"
            secondary={secondaryText}
          />
        </ListItem>
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
        <ListItem
          button
          key={table.id}
          onClick={(e) => this.handleOpenTableTab(e, table.id)}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name={table.icon} />
          </ListItemIcon>
          <ListItemText
            primary={table.capNameSingle}
            secondary={secondaryText}
          />
        </ListItem>
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
  },
});

export default Finder;

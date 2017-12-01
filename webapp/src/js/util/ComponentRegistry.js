const dynreq = require.context('../components', true);
import getDisplayName from 'util/getDisplayName';
import filterChildren from 'util/filterChildren';
import React from 'react';
import _isArray from 'lodash/isArray';

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}

const typeByDisplayName = {};
dynreq.keys().forEach((component) => {
  if (!component.endsWith('.js') && !component.endsWith('.css')) {
    let reactClass = dynreq(component);
    if (reactClass.__esModule) {
      reactClass = reactClass.default;
    }
    const displayName = getDisplayName(reactClass);
    if (displayName == 'Component') {
      console.error(`No displayName for:${component}`);
    } else if (typeByDisplayName[displayName]) {
      console.error(`Duplicate component displayName:${displayName} in ${component}`);
    } else {
      typeByDisplayName[displayName] = reactClass;
    }
  }
});

//We now add in specific material-ui classes
import Card, { CardHeader, CardMedia, CardContent, CardActions } from 'material-ui/Card';
typeByDisplayName['Card'] = Card;
typeByDisplayName['CardActions'] = CardActions;
typeByDisplayName['CardHeader'] = CardHeader;
typeByDisplayName['CardMedia'] = CardMedia;
typeByDisplayName['CardContent'] = CardContent;

import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
typeByDisplayName['List'] = List;
typeByDisplayName['ListItem'] = ListItem;
let wrappedListItemIcon = ({children}) => {
  children = filterChildren(this, children);
  return <ListItemIcon>{children}</ListItemIcon>;
};
wrappedListItemIcon.displayName = "ListItemIcon";
typeByDisplayName['ListItemIcon'] = wrappedListItemIcon;

let wrappedListItemText = ({children}) => {
  children = filterChildren(this, children);
  if (_isArray(children)) {
    return <ListItemText primary={children[0]} secondary={children[1]}/>;
  }
  else return <ListItemText primary={children}/>;
};
wrappedListItemText.displayName = "ListItemText";
typeByDisplayName['ListItemText'] = wrappedListItemText;

import Typography from 'material-ui/Typography';
Typography.displayName = 'Typography';

typeByDisplayName['Typography'] = Typography;

import {Tabs, Tab} from 'material-ui/Tabs';
typeByDisplayName['Tabs'] = Tabs;
typeByDisplayName['Tab'] = Tab;

console.info('Components: %o', typeByDisplayName);

export default function(displayName) {
  return typeByDisplayName[displayName];
}

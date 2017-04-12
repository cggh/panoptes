const dynreq = require.context('../components', true);
import getDisplayName from 'react-display-name';

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}

const typeByDisplayName = {};
dynreq.keys().forEach((component) => {
  if (!component.endsWith('.js') && !component.endsWith('.css') &&
    component !== './Panoptes'
  ) {
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
import {Card, CardActions, CardHeader, CardTitle, CardText} from 'material-ui/Card';
typeByDisplayName['Card'] = Card;
typeByDisplayName['CardActions'] = CardActions;
typeByDisplayName['CardHeader'] = CardHeader;
typeByDisplayName['CardTitle'] = CardHeader;
typeByDisplayName['CardText'] = CardText;
import {Tabs, Tab} from 'material-ui/Tabs';
typeByDisplayName['Tabs'] = Tabs;
typeByDisplayName['Tab'] = Tab;

export default function(displayName) {
  return typeByDisplayName[displayName];
}

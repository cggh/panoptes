const dynreq = require.context('../components', true);
import getDisplayName from 'util/getDisplayName';

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
import Card, {CardActions, CardContent, CardMedia, CardHeader} from 'material-ui/Card';
typeByDisplayName['Card'] = Card;
typeByDisplayName['CardActions'] = CardActions;
typeByDisplayName['CardContent'] = CardContent;
typeByDisplayName['CardMedia'] = CardMedia;
typeByDisplayName['CardHeader'] = CardHeader;
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

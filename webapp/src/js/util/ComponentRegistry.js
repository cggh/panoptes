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

export default function(displayName) {
  return typeByDisplayName[displayName];
}

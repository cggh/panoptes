import getDisplayName from 'react-display-name';

export default function displayName(componentType) {
  let displayName = getDisplayName(componentType);
  displayName = displayName.split('(');
  if (displayName.length > 1) {
    displayName = displayName[1].substr(0, displayName[1].length - 1);
  } else {
    displayName = displayName[0];
  }
  return displayName;
}

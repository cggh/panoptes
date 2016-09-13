import getDisplayName from 'react-display-name';
import _map from 'lodash/map';
import _isString from 'lodash/isString';

export default function serialiseComponent(component) {
  if (_isString(component)) {
    return component;
  }
  const displayName = getDisplayName(component.type);
  if (displayName == 'Component') {
    debugger;
    throw Error(`Attempted to serialise a non React component`);
  }
  let {children, ...other} = component.props;
  if (Array.isArray(children)) {
    children = _map(children, serialiseComponent);
  } else if (children) {
    children = serialiseComponent(children);
  }
  return {
    type: displayName,
    props: {children, ...other}
  };
}

import getDisplayName from 'react-display-name';
import _map from 'lodash/map';
import _isString from 'lodash/isString';
import _isFunction from 'lodash/isFunction';
import _isArray from 'lodash/isArray';

export default function serialiseComponent(component) {
  if (_isArray(component)) {
    throw Error(`Attempted to serialise an array - need React component`);
  }
  if (_isString(component)) {
    return component;
  }
  const displayName = getDisplayName(component.type);
  if (displayName == 'Component') {
    debugger;
    throw Error(`Attempted to serialise a non React component`);
  }
  let {children, ...other} = component.props;
  const otherFiltered = {}
  _map(other, (val, key) => {
    if (_isFunction(val)) {
      console.warn(`Can't serialise function prop ${key} on ${displayName}`)
    } else {
      otherFiltered[key] = val;
    }
  });
  if (Array.isArray(children)) {
    children = _map(children, serialiseComponent);
  } else if (children) {
    children = serialiseComponent(children);
  }
  return {
    type: displayName,
    props: {children, ...otherFiltered}
  };
}

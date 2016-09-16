import displayName from 'react-display-name';
import _includes from 'lodash/includes';
import _isString from 'lodash/isString';
import _isArray from 'lodash/isArray';
import _filter from 'lodash/filter';

export default function filterChildren(parent, allowed, children) {
  if (!children || children.length === 0)
    return null;

  function childOK(child) {
    if (_isString(child)) {
      if (child.trim() !== '') { //Only error on non-whitespace strings, removing them from the return so we can have nice formatting in th e HTML
        throw Error(`Text is not a valid child of ${displayName(parent.constructor)}`);
      }
      return false
    }
    const name = displayName(child.type);
    if (name === 'Component') {
      throw Error(`Can't get name for child of ${displayName(parent.constructor)}`);
    }
    if (_includes(allowed, name)) {
      return true;
    }
    throw Error(`${name} cannot be a child of ${displayName(parent.constructor)}`);
  }

  if (_isArray(children)) {
    return _filter(children, childOK)
  }

  return childOK(children);
}
import displayName from 'util/getDisplayName';
import _includes from 'lodash.includes';
import _isString from 'lodash.isstring';
import _isArray from 'lodash.isarray';
import _filter from 'lodash.filter';

export default function filterChildren(parent, children, allowed) {
  if (!children || children.length === 0)
    return null;

  function childOK(child) {

    if (!child) return false;

    if (_isString(child)) {
      if (child.trim() !== '') { //Only error on non-whitespace strings, removing them from the return so we can have nice formatting in th e HTML
        throw Error(`Text is not a valid child of ${displayName(parent.constructor)}`);
      }
      return false;
    }

    const name = displayName(child.type);

    if (name === 'Component') {
      throw Error(`Can't get name for child of ${displayName(parent.constructor)}`);
    }
    if (!allowed || _includes(allowed, name)) {
      return true;
    }
    throw Error(`${name} cannot be a child of ${displayName(parent.constructor)}`);
  }

  if (_isArray(children)) {
    children  = _filter(children, childOK);
    if (children.length === 0) {
      return null;
    } else if (children.length === 1) {
      return children[0];
    }
    return children;
  }
  //We have a single child
  return childOK(children) ? children : null;
}

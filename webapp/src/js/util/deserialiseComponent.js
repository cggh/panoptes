import React from 'react';
import {List} from 'immutable';
import ComponentRegistry from 'util/ComponentRegistry';
import _isString from 'lodash.isstring';
import _forEach from 'lodash.foreach';

export default function deserialiseComponent(component, path = null, mappedFunctions = {}) {
  function _deserialiseComponent(component, path) {
    if (_isString(component)) {
      return component;
    }
    component = component.toObject();
    let {type, props} = component;
    type = ComponentRegistry(type) || type;
    const serialisedChildren = props ? props.get('children') : null;  //eslint-disable-line react/prop-types
    let children = null;
    if (List.isList(serialisedChildren)) {  //We don't check for element type as on serialisation lone children are placed in an array.
      children = serialisedChildren.map((child, i) => {
        if (child.getIn && !child.getIn(['props', 'key'])) {
          child = child.setIn(['props', 'key'], i)
        }
        return _deserialiseComponent(child, path ? path.concat('props', 'children', i) : null);
      }).toArray();
    }
    const otherProps = props ? props.delete('children').toJS() : {}; //eslint-disable-line react/prop-types
    if (type.propTypes) {
      _forEach(mappedFunctions, (func, name) => {
        if (type.propTypes[name]) {
          otherProps[name] = (...args) => func(path, ...args);
        }
      });
    }
    if (type.propTypes && type.propTypes.childrenHash && serialisedChildren && serialisedChildren.hashCode) {
      otherProps.childrenHash = serialisedChildren.hashCode();
    }
    return React.createElement(type, otherProps, children);
  }
  return _deserialiseComponent(component, path);
}

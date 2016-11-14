import React from 'react';
import {List} from 'immutable';
import ComponentRegistry from 'util/ComponentRegistry';
import _isString from 'lodash/isString';
import _forEach from 'lodash/forEach';

export default function deserialiseComponent(component, path = null, mappedFunctions = {}) {
  function _deserialiseComponent(component, path) {
    if (_isString(component)) {
      return component;
    }
    component = component.toObject();
    let {type, props} = component;
    type = ComponentRegistry(type) || type;
    let children = props ? props.get('children') : null;  //eslint-disable-line react/prop-types
    if (List.isList(children)) {  //We don't check for element type as on serialisation lone children are placed in an array.
      children = children.map((child, i) =>
        _deserialiseComponent(child, path ? path.concat('props', 'children', i) : null)
      ).toArray();
    }
    const otherProps = props ? props.delete('children').toJS() : {}; //eslint-disable-line react/prop-types
    if (type.propTypes) {
      _forEach(mappedFunctions, (func, name) => {
        if (type.propTypes[name]) {
          otherProps[name] = (...args) => func(path, ...args);
        }
      });
    }
    if (type.propTypes.childrenHash) {

    }
    return React.createElement(type, {children, ...otherProps});
  }

  return _deserialiseComponent(component, path);

}

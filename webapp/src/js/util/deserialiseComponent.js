import React from 'react';
import {Map, List} from 'immutable';
import _map from 'lodash/map';
import ComponentRegistry from 'util/ComponentRegistry';
import _isString from 'lodash/isString';

export default function deserialiseComponent(component) {
  if (_isString(component)) {
    return component;
  }
  component = component.toObject();
  let {type, props} = component;
  type = ComponentRegistry(type) || type;
  let children = props.get('children');
  if (List.isList(children)) {
    children = children.map(deserialiseComponent).toArray();
  } else if (children) {
    children = deserialiseComponent(children);
  }
  const otherProps = props.delete('children').toJS();
  return React.createElement(type, {children, ...otherProps});
};

import React from 'react';

function map(children, func, context) {
  return React.Children.map(children, (child, i) => {
    if (React.isValidElement(child)) {
      return func.call(context, child, i);
    }
    return child;
  });
}


export default {
  map: map
};

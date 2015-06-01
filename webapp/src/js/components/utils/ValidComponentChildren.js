const React = require('react');

function map(children, func, context) {
  return React.Children.map(children, function(child) {
    if (React.isValidElement(child)) {
      return func.call(context, child);
    }
    return child;
  })
}


module.exports = {
  map: map
};

import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

let CustomExample = createReactClass({
  displayName: 'CustomExample',
  mixins: [PureRenderMixin],

  render() {
    return (
      <div>
        CUSTOM COMPONENT EXAMPLE
      </div>
    );
  },
});

export default CustomExample;

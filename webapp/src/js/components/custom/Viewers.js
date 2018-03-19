import React from 'react';
import createReactClass from 'create-react-class';
import DocTemplate from 'panoptes/DocTemplate';

let Viewers = createReactClass({
  displayName: 'Viewers',
  render() { return <DocTemplate path="viewers.html"/>; },
});

export default Viewers;

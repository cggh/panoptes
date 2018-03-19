import React from 'react';
import createReactClass from 'create-react-class';
import Card, {CardContent, CardHeader} from 'material-ui/Card';

let Viewers = createReactClass({
  displayName: 'Viewers',

  render() {

    return (
      <div className="centering-container">
        <Card>
          <CardHeader title="TODO: I am a CardHeader"/>
          <CardContent>
            TODO: Viewers.js (I am a CardContent.)
          </CardContent>
        </Card>
      </div>);
  },
});

export default Viewers;

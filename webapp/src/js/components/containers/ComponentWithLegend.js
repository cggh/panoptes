import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {Card, CardText} from 'material-ui/Card';
import filterChildren from 'util/filterChildren';

let ComponentWithLegend = createReactClass({
  displayName: 'ComponentWithLegend',

  propTypes: {
    children: PropTypes.node
  },


  render() {
    let {children} = this.props;
    children = filterChildren(this, children);
    return (
      <div className="vertical stack">
        <div className="centering-container">
          <Card style={{width: '500px'}}>{children[0]}</Card>
        </div>
        <div className="centering-container grow">
          <div style={{width: '80%', height: '100%'}}>
            {children[1]}
          </div>
        </div>
      </div>
    );
  },
});

export default ComponentWithLegend;

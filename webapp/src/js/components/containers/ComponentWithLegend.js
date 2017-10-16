import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Card, {CardContent} from 'material-ui/Card';
import filterChildren from 'util/filterChildren';
import {withStyles} from 'material-ui/styles';

const styles = (theme) => ({
  card: {
    maxWidth: 650,
  },
});

let ComponentWithLegend = createReactClass({
  displayName: 'ComponentWithLegend',

  propTypes: {
    children: PropTypes.node,
    classes: PropTypes.object
  },

  render() {
    let {children, classes} = this.props;
    children = filterChildren(this, children);
    return (
      <div className="centering-container">
        <Card className={classes.card}>
          {children[0]}
          <CardContent>
            {children[1]}
          </CardContent>
        </Card>
      </div>
    );
  },
});

let module = withStyles(styles)(ComponentWithLegend);
module.displayName = 'ComponentWithLegend';
module.propTypes = ComponentWithLegend.propTypes;
export default module;

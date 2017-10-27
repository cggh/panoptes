import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Card, {CardContent, CardHeader, CardActions} from 'material-ui/Card';
import filterChildren from 'util/filterChildren';
import {withStyles} from 'material-ui/styles';
import Collapse from 'material-ui/transitions/Collapse';
import ExpandMoreIcon from 'material-ui-icons/ExpandMore';
import IconButton from 'material-ui/IconButton';
import classnames from 'classnames';

const ALLOWED_CHILDREN = [
  'Typography',
];

const styles = (theme) => ({
  card: {
    width: '100%',
  },
  cardActions: {
    height: 'inherit',
    alignItems: 'flex-start',
  },
  expand: {
    transform: 'rotate(0deg)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
  flexGrow: {
    flex: '1 1 auto',
  },
});

let ExpandingCard = createReactClass({
  displayName: 'ComponentWithLegend',

  propTypes: {
    children: PropTypes.node,
    classes: PropTypes.object,
    title: PropTypes.string,
    subheader: PropTypes.string,
  },

  getInitialState() {
    return {
      expanded: false,
    };
  },

  handleExpandClick() {
    this.setState({expanded: !this.state.expanded});
  },

  render() {
    let {title, subheader, children, classes} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);
    return (
      <Card className={classes.card}>
        <CardActions disableActionSpacing className={classes.cardActions}>
          <CardHeader
            title={title}
            subheader={subheader}
          />
          <div className={classes.flexGrow} />
          <IconButton
            className={classnames(classes.expand, {
              [classes.expandOpen]: this.state.expanded,
            })}
            onClick={this.handleExpandClick}
            aria-expanded={this.state.expanded}
            aria-label="Show more"
          >
            <ExpandMoreIcon />
          </IconButton>
        </CardActions>
        <Collapse in={this.state.expanded} transitionDuration="auto" unmountOnExit>
          <CardContent>
            {children}
          </CardContent>
        </Collapse>
      </Card>
    );
  },
});

let module = withStyles(styles)(ExpandingCard);
module.displayName = 'ExpandingCard';
module.propTypes = ExpandingCard.propTypes;
export default module;

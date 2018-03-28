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
  'Typography', 'CardHeader', 'CardContent', 'ExpandingCardCollapse', 'ExpandingCardActions'
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
    actionsAreaIsClickable: PropTypes.bool,
    actionsAreaDisappearsOnExpand: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      actionsAreaIsClickable: false,
      actionsAreaDisappearsOnExpand: false,
    };
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
    let {title, subheader, children, classes, actionsAreaIsClickable, actionsAreaDisappearsOnExpand} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    // Style 1: title and subheader props with Typography children.
    // Style 2: Optional children CardHeader, CardMedia, CardContent,
    // ExpandingCardActions, ExpandingCardCollapse

    let staticContent = undefined;
    let collapsableContent = undefined;
    let typographies = [];
    let expandingCardCollapse = undefined;
    let expandingCardActions = undefined;
    let otherChildren = [];
    for (let i = 0; i < children.length; i++) {

      let child  = children[i];

      if (child.type.displayName === 'Typography') {
        typographies.push(child);
      } else if (child.type.displayName === 'ExpandingCardCollapse') {
        if (expandingCardCollapse !== undefined) {
          throw Error('ExpandingCard does not handle more than one ExpandingCardCollapse child.');
        }
        expandingCardCollapse = child.props.children;
      } else if (child.type.displayName === 'ExpandingCardActions') {
        if (expandingCardActions !== undefined) {
          throw Error('ExpandingCard does not handle more than one ExpandingCardActions child.');
        }
        expandingCardActions = child.props.children;
      } else {
        otherChildren.push(child);
      }

    }

    let cardActionsContent = undefined;
    if (typographies.length > 0) {
      collapsableContent = <CardContent>{typographies}</CardContent>;
      cardActionsContent = <CardHeader title={title} subheader={subheader}/>;
    } else {
      collapsableContent = expandingCardCollapse;
      cardActionsContent = expandingCardActions;
      staticContent = otherChildren;
    }

    return (
      <Card className={classes.card}>
        {staticContent}
        <CardActions
          disableActionSpacing
          className={classes.cardActions}
          onClick={actionsAreaIsClickable ? this.handleExpandClick : undefined}
          style={{cursor: actionsAreaIsClickable ? 'pointer' : 'auto'}}
        >
          {actionsAreaDisappearsOnExpand && this.state.expanded ? null : cardActionsContent}
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
          {collapsableContent}
        </Collapse>
      </Card>
    );
  },
});

let module = withStyles(styles)(ExpandingCard);
module.displayName = 'ExpandingCard';
module.propTypes = ExpandingCard.propTypes;
export default module;

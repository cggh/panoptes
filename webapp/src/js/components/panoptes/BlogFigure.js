import React from 'react';
import PropTypes from 'prop-types';
import {Card, CardContent, CardMedia, Typography} from '@material-ui/core';

class BlogFigure extends React.Component {
  static displayName = 'BlogFigure';

  static propTypes = {
    children: PropTypes.node,
    title: PropTypes.string,
  };

  render() {
    let {children, title} = this.props;
    return <Card className="blog-figure centering-container">
      <Typography variant="title">
        {title}
      </Typography>
        {children}
    </Card>;
  }
}

export default BlogFigure;

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
    return <Card className="blog-figure ">
      <Typography variant="title">
        {title}
      </Typography>
      <div className="centering-container">
        {children}
      </div>
    </Card>;
  }
}

export default BlogFigure;

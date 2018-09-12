import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import {Card, CardContent, CardMedia, Typography} from '@material-ui/core';
import HTMLWithComponents from './HTMLWithComponents';
// import 'blog.scss';

let FeedItem = createReactClass({
  displayName: 'FeedItem',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    feedId: PropTypes.string,
    itemId: PropTypes.string,
    resetScroll: PropTypes.func
  },

  componentWillMount() {
    if (this.props.resetScroll) this.props.resetScroll();
  },

  componentWillUpdate(nextProps) {
    if (this.props.resetScroll && (
      this.props.feedId !== nextProps.feedId ||
      this.props.itemId !== nextProps.itemId
    )) this.props.resetScroll();
  },

  render() {
    const {feedId, itemId} = this.props;

    let feed = this.config.feeds[feedId];
    if (feed === undefined) {
      return <div>No feed {{feedId}} defined</div>;
    }

    let item = feed.itemsById[itemId];
    if (!item) {
      return `No post with id ${itemId} found`;
    }

    let {title, pubDate, thumbnail} = item;

    const content = item['content:encoded'];
    const creator = item['dc:creator'];
    const date = new Date(pubDate);
    const fullYear = date.getFullYear();
    const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()];
    const zeroPaddedDayOfMonth = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const dateMMDDDDYYYY = zeroPaddedDayOfMonth + ' ' + monthName + ' ' + fullYear;
    const subheader = 'by ' + creator + ', ' + dateMMDDDDYYYY;

    return <div className="page-container">
      <div className="horiz-centering-container vertical stack page-content">
        <Card className="blog-list-entry" style={{maxWidth: '650px'}}>
            <CardContent>
            <Typography className="blog-list-entry-headline" variant="headline">
              {title}
            </Typography>
            <Typography variant="subheading" color="textSecondary">
              {subheader}
            </Typography>
            <Typography component="div" className="paragraph">
              {thumbnail ?
                <img
                  className="blog-article-media"
                  src={thumbnail.img['@src']}
                /> : null}
              <HTMLWithComponents>{content}</HTMLWithComponents>
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>;
  },
});


export default FeedItem;

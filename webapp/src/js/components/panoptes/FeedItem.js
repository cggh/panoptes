import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import {Card, CardContent, CardMedia, Typography} from '@material-ui/core';
import HTMLWithComponents from './HTMLWithComponents';
import DocTemplate from 'panoptes/DocTemplate';

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
      <div>
        {thumbnail ?
          <img
            className="blog-article-media"
            src={thumbnail.img['@src']}
          /> : null}
        <div className="blog-background">
          <div className="blog-article">
            <h1>{title}</h1>
            <h3>{subheader}</h3>
            <HTMLWithComponents className="blog-content">{content}</HTMLWithComponents>
          </div>
        </div>
      </div>
      <div className="centering-container">
        <DocTemplate path="templates/footer.html"/>
      </div>
    </div>;
  },
});


export default FeedItem;



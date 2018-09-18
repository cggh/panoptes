import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import DocTemplate from 'panoptes/DocTemplate';
import FeedItem from 'panoptes/FeedItem';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import {Card, CardContent, CardMedia, Typography} from '@material-ui/core';
import _filter from 'lodash.filter';
import _isArray from 'lodash.isarray';
import _intersection from 'lodash.intersection';

import 'blog.scss';
import HTMLWithComponents from './HTMLWithComponents';

let Feed = createReactClass({
  displayName: 'Feed',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    replaceSelf: PropTypes.func,
    replaceParent: PropTypes.func,
    id: PropTypes.string,
    templateDocPath: PropTypes.string,
    className: PropTypes.string,
    actionsAreaIsClickable: PropTypes.bool,
    actionsAreaDisappearsOnExpand: PropTypes.bool,
    tags: PropTypes.string,
    count: PropTypes.number
  },

  getDefaultProps() {
    return {
      actionsAreaIsClickable: true,
      actionsAreaDisappearsOnExpand: true,
    };
  },

  handleClick(feedId, itemId) {
    let f = this.props.replaceSelf || this.props.replaceParent;
    if (f) {
      f(<FeedItem feedId={feedId} itemId={itemId}/>);
    }
  },

  render() {
    const {id, templateDocPath, className, actionsAreaIsClickable, actionsAreaDisappearsOnExpand, tags, count, ...otherProps} = this.props;

    let feedObj = this.config.feeds[id];

    if (feedObj === undefined) {
      return <div>No feed {id} defined</div>;
    }

    let items = [];
    if (Array.isArray(feedObj.rss.channel.item)) {
      items = feedObj.rss.channel.item;
    } else if (feedObj.rss.channel.item !== undefined) {
      items.push(feedObj.rss.channel.item);
    } else {
      console.warn('There is no item array or item property in this feedObj.rss.channel: ', feedObj.rss.channel);
    }

    if (tags) {
      let tagArray = tags.split(',').map((tag) => tag.trim());
      items = _filter(items, (item) => _intersection(tagArray, _isArray(item.category) ? item.category : [item.category]).length > 0);
    }

    if (count !== undefined) {
      items = items.slice(0, count);
    }


    let cards = [];
    items.forEach((item) => {
      let {thumbnail, pubDate, title, description, link} = item;

      description = description === null ? '' : description;
      let elements = link.split('/');
      let itemId = elements[elements.length - 2];

      // Remove text after any of these text barriers. Order matters.
      const textBarriers = ['[&#8230;]', '&#8230;'];
      if (typeof description === 'string') {
        for (const textBarrier of textBarriers) {
          const indexOfTextBarrier = description.indexOf(textBarrier);
          if (indexOfTextBarrier !== -1) {
            description = description.substring(0, indexOfTextBarrier);
          }
        }
      }
      const content = item['content:encoded'];
      const creator = item['dc:creator'];
      const date = new Date(pubDate);
      const fullYear = date.getFullYear();
      const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()];
      const zeroPaddedDayOfMonth = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
      const dateMMDDDDYYYY = zeroPaddedDayOfMonth + ' ' + monthName + ' ' + fullYear;
      const subheader = 'by ' + creator + ', ' + dateMMDDDDYYYY;

      if (templateDocPath !== undefined) {
        cards.push(
          <DocTemplate
            key={itemId}
            path={templateDocPath}
            className={className}
            actionsAreaIsClickable={actionsAreaIsClickable}
            actionsAreaDisappearsOnExpand={actionsAreaDisappearsOnExpand}
            pubDate={pubDate}
            title={title}
            description={description}
            content={content}
            creator={creator}
            dateMMDDDDYYYY={dateMMDDDDYYYY}
            subheader={subheader}
            {...otherProps}
          />
        );
      } else {
        cards.push(
          <Card key={itemId} className="blog-list-entry" onClick={() => this.handleClick(id, itemId)}>
            <div className="blog-list-entry-details">
              <CardContent className="blog-list-entry-content">
                {thumbnail ?
                  <CardMedia
                    className="blog-list-entry-media"
                    image={thumbnail.img['@src']}
                  /> : null}
                <Typography className="blog-list-entry-headline" variant="headline">
                  {title}
                </Typography>
                <Typography variant="subheading" color="textSecondary" paragraph={true}>
                  {subheader}
                </Typography>
                <Typography >
                  <HTMLWithComponents>{description}</HTMLWithComponents> <a> Read more... </a>
                </Typography>
              </CardContent>
            </div>
          </Card>
        );
      }
    });

    return cards;
  },
});


export default Feed;

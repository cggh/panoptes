import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import HandlebarsWithComponents from 'panoptes/HandlebarsWithComponents';
import DocTemplate from 'panoptes/DocTemplate';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import ExpandingCard from 'containers/ExpandingCard';
import ExpandingCardActions from 'containers/ExpandingCardActions';
import ExpandingCardCollapse from 'containers/ExpandingCardCollapse';
import {CardContent, CardHeader} from 'material-ui/Card';


let Feed = createReactClass({
  displayName: 'Feed',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    id: PropTypes.string,
    feedObj: PropTypes.object, // This will be provided via withAPIData
    templateDocPath: PropTypes.string,
    className: PropTypes.string,
    actionsAreaIsClickable: PropTypes.bool,
    actionsAreaDisappearsOnExpand: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      actionsAreaIsClickable: true,
      actionsAreaDisappearsOnExpand: true,
    };
  },

  render() {
    const {feedObj, templateDocPath, className, actionsAreaIsClickable, actionsAreaDisappearsOnExpand, ...otherProps} = this.props;

    if (feedObj === undefined) {
      return <Loading status="loading"/>;
    }

    let cards = [];

    let items = [];
    if (Array.isArray(feedObj.rss.channel.item)) {
      items = feedObj.rss.channel.item;
    } else if (feedObj.rss.channel.item !== undefined) {
      items.push(feedObj.rss.channel.item);
    } else {
      console.warn('There is no item array or item property in this feedObj.rss.channel: ', feedObj.rss.channel);
    }

    items.forEach((item) => {
      const {pubDate, title, description, guid} = item;
      const guidText = guid['#text'];
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
            key={guidText}
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
          <ExpandingCard
            key={guidText}
            actionsAreaIsClickable={actionsAreaIsClickable}
            actionsAreaDisappearsOnExpand={actionsAreaDisappearsOnExpand}
          >
            <CardHeader title={title} subheader={subheader} />
            <ExpandingCardActions>
              <div style={{paddingLeft: '12px'}}>
                <HandlebarsWithComponents>{description}</HandlebarsWithComponents>
              </div>
            </ExpandingCardActions>
            <ExpandingCardCollapse>
              <CardContent>
                <HandlebarsWithComponents>{content}</HandlebarsWithComponents>
              </CardContent>
            </ExpandingCardCollapse>
          </ExpandingCard>
        );
      }
    });

    return <div className={className}>{cards}</div>;
  },
});

Feed = withAPIData(Feed, ({config, props}) => {

  const {id} = props;

  if (config.feeds[id] === undefined) {
    throw Error('Feed id ' + id + ' not found in dataset feeds: ', config.feeds);
  }

  let requests = {
    feedObj: {
      method: 'fetchFeedData',
      args: {
        url: config.feeds[id].url,
      }
    }
  };

  return {requests};
});

export default Feed;

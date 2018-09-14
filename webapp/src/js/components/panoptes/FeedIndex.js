import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import Feed from 'panoptes/Feed';
import CardStack from 'panoptes/CardStack';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import _union from 'lodash.union';
import _isArray from 'lodash.isarray';
import _includes from 'lodash.includes';
import _pull from 'lodash.pull';
// import 'blog.scss';

let FeedIndex = createReactClass({
  displayName: 'FeedIndex',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    id: PropTypes.string,
    selectedTags: PropTypes.string,
    setProps: PropTypes.func,
    replaceSelf: PropTypes.func,
    replaceParent: PropTypes.func,
    resetScroll: PropTypes.func
  },

  getDefaultProps() {
    return {
      selectedTags: '',
    };
  },

  componentWillMount() {
    if (this.props.resetScroll) this.props.resetScroll();
  },

  render() {
    let {id, setProps, selectedTags, replaceSelf, replaceParent} = this.props;

    let feed = this.config.feeds[id];
    if (feed === undefined) {
      return <div>No feed {{id}} defined</div>;
    }

    let {title, description, item} = feed.rss.channel;

    let items = [];
    if (Array.isArray(item)) {
      items = item;
    } else if (item !== undefined) {
      items.push(item);
    } else {
      console.warn('There is no item array or item property in this feedObj.rss.channel: ', id);
    }

    let tags = items.map((ite) => _isArray(ite.category) ? ite.category : [ite.category]);
    tags = _union.apply(null, tags);
    selectedTags = selectedTags.split(',').map((tag) => tag.trim());
    if (selectedTags.length === 0) {
      selectedTags = tags;
    }


    return <div className="page-container">
      <div className="horiz-centering-container vertical stack page-content">
        {title ? <h1>{title}</h1> : ''}
        {description ? <h2>{description}</h2> : ''}
        <CardStack noWrap thin>
          <div>
            {tags.map((tag) => <div key={tag} style={{display: 'inline-block'}}>
              <FormControlLabel
                key={tag}
                control={
                  <Checkbox
                    checked={_includes(selectedTags, tag)}
                    // onChange={this.handleChange('checkedA')}
                    value={tag}
                    onChange={(event, checked) => {
                      if (checked) {
                        setProps({selectedTags: _union(selectedTags, [tag]).join(',')});
                      } else {
                        setProps({selectedTags: _pull(selectedTags, tag).join(',')});
                      }
                    }}
                  />
                }
                label={tag}
              />
            </div>
            )}
          </div>
          <Feed id={id} replaceSelf={replaceSelf} replaceParent={replaceParent} tags={selectedTags.join(',')}/>
        </CardStack>
      </div>
    </div>;
  },
});


export default FeedIndex;

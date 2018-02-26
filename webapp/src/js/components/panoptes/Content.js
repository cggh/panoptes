import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _isArray from 'lodash.isarray';
import filterChildren from 'util/filterChildren';
import PropTypes from 'prop-types';

//Child of CustomButton, ToggleBox, PopupButton

let Content = createReactClass({
  displayName: 'Content',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    children: PropTypes.node,
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('Content can only have one child until https://github.com/facebook/react/issues/2127');
    }
    return children;
  },
});

export default Content;

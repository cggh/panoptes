import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _isArray from 'lodash.isarray';
import filterChildren from 'util/filterChildren';

//Child of CustomButton, ToggleBox

let Content = createReactClass({
  displayName: 'Content',

  mixins: [
    PureRenderMixin,
  ],

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

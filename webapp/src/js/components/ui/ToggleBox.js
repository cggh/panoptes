import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Content from 'panoptes/Content';
import filterChildren from 'util/filterChildren';

let ToggleBox = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
  	isHidden: React.PropTypes.bool,
    children: function(props, propName, componentName) {
      // Only accept a single child, of the appropriate type
      let children = filterChildren(this, React.Children.toArray(props[propName]));
      if (!(children[0].type === "Title" && children[1].type === Content))
        return new Error(
          '`' + componentName + '` ' +
          'should have two children: one Title followed by one Content'
        );
    }
  },

  getDefaultProps: function () {
    return { isHidden:true } ;
  } ,

  getInitialState: function() {
      return {
          isHidden: this.props.isHidden
      };
  },

  handleToggle: function () {
  	this.setState ( { isHidden: !this.state.isHidden } )
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, React.Children.toArray(children));
    if (!((children[0].type === "Title" && children[1].type === Content) ||
    (children[1].type === "Title" && children[0].type === Content)))
    throw Error(
      'ToggleBox should have two children: one Title followed by one Content'
    );

    let [title, content] = children;
    let v1 = this.state.isHidden ? 'block' : 'none' ;
    let v2 = !this.state.isHidden ? 'block' : 'none' ;

  	return (
  		<div>
        <div style={{display:'table-cell','vertical-align':'top',margin:'2px','text-align':'center',width:'1em',padding:'1px'}}>
          <div style={{cursor:'pointer','border-radius':'5px',border:'1px solid black'}} onClick={this.handleToggle}>
            <div style={{display:v1}}>+</div>
            <div style={{display:v2}}>-</div>
          </div>
        </div>
        <div style={{display:'table-cell','vertical-align':'top',margin:'2px'}}>
          <div>{title.props.children}</div>
          <div style={{display:v2}}>{content}</div>
        </div>
  		</div>
  	) ;
  }

});

export default ToggleBox;

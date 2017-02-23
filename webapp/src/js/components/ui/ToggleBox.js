import React from 'react';
import classNames from 'classnames';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _assign from 'lodash/assign';

let ToggleBox = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
  	isHidden: React.PropTypes.bool,
    children: React.PropTypes.element // Needs to be two elements, which counts as 5 children in React?
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
	let title = this.props.children[1] ; // First element; title that is always shown
	let payload = this.props.children[3] ; // Second element; payload that can be toggled
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
  			<div>{title}</div>
  			<div style={{display:v2}}>{payload}</div>
  		</div>
  		</div>
  	) ;
  }

});

export default ToggleBox;

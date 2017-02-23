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

  getInitialState: function() {
      return {
          isHidden: true
      };
  },
    
  handleShow: function () {
  	this.setState ( { isHidden: false } )
  },
  
  handleHide: function () {
  	this.setState ( { isHidden: true } )
  },
  
  render() {
	let title = this.props.children[1] ; // First element; title that is always shown
	let payload = this.props.children[3] ; // Second element; payload that can be toggled
	let v1 = this.state.isHidden ? 'block' : 'none' ;
	let v2 = !this.state.isHidden ? 'block' : 'none' ;
	
  	return (
  		<div>
  		<div style={{display:'inline-block','vertical-align':'top',margin:'2px',cursor:'pointer','border-radius':'5px',border:'1px solid black',padding:'1px'}}>
  			<div style={{display:v1}} onClick={this.handleShow}>+</div>
  			<div style={{display:v2}} onClick={this.handleHide}>-</div>
  		</div>
  		<div style={{display:'inline-block','vertical-align':'top',margin:'2px'}}>
  			<div>{title}</div>
  			<div style={{display:v2}}>{payload}</div>
  		</div>
  		</div>
  	) ;
  }

});

export default ToggleBox;

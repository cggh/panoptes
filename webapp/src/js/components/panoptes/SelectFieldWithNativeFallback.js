import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Constants for this component
// TODO: move to app config?
const MAX_SELECTFIELD_OPTIONS = 100;

let SelectFieldWithNativeFallback = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    value: React.PropTypes.string,
    autoWidth: React.PropTypes.bool,
    floatingLabelText: React.PropTypes.string,
    onChange: React.PropTypes.func,
    options: React.PropTypes.array,
  },

  render() {
    let {value, autoWidth, floatingLabelText, onChange, options} = this.props;

    if (options.length > MAX_SELECTFIELD_OPTIONS) {
      return (
        <div
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            width: '256px',
            height: '72px',
            display: 'inline-block',
            position: 'relative',
            fontFamily: 'Roboto, sans-serif',
            transition: 'height 200ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
            backgroundColor: 'transparent'
          }}
        >
          <label
            style={{
              position: 'absolute',
              lineHeight: '22px',
              top: '38px',
              transition: 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
              zIndex: '1',
              cursor: 'text',
              transform: 'perspective(1px) scale(0.75) translate3d(0px, -28px, 0px)',
              transformOrigin: 'left top 0px',
              pointerEvents: 'none',
              color: 'rgba(0, 0, 0, 0.498039)'
            }}
          >
            {floatingLabelText}
          </label>
          <div
            style={{
              display: 'block',
              fontSize: 'inherit',
              height: '100%',
              fontFamily: 'inherit',
              outline: 'none',
              position: 'relative',
              transition: 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
              padding: '0px',
              width: '100%',
              border: 'none',
              color: 'rgba(0, 0, 0, 0.870588)',
              fontStyle: 'inherit',
              fontVariant: 'inherit',
              fontWeight: 'inherit',
              fontStretch: 'inherit',
              lineHeight: 'inherit',
              boxSizing: 'border-box',
              marginTop: '14px',
              backgroundColor: 'rgba(0, 0, 0, 0)'
            }}
          >
            <div
              style={{
                cursor: 'pointer',
                height: '100%',
                position: 'relative',
                width: '100%'
              }}
            >
              <div
                style={{
                  boxSizing: 'border-box',
                  display: 'table'
                }}
              > </div>
              <select
                style={{
                  width: '100%',
                  appearance: 'none',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  display: 'block',
                  color: 'rgba(0, 0, 0, 0.870588)',
                  lineHeight: '56px',
                  opacity: '1',
                  position: 'relative',
                  paddingLeft: '0px',
                  paddingRight: '48px',
                  top: '6px'
                }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
               <option
                className="dropdown-option"
                value=""
               ></option>
                {options.map(({value, label}) =>
                  <option
                    className="dropdown-option"
                    key={value}
                    value={value}
                    label={label || value}
                  />
                )}
              </select>
              <svg
                viewBox="0 0 24 24"
                style={{
                  display: 'inline-block',
                  fill: 'rgb(224, 224, 224)',
                  height: '24px',
                  width: '24px',
                  transition: 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
                  position: 'absolute',
                  right: '0px',
                  top: '22px'
                }}
              >
                <path d="M7 10l5 5 5-5z"></path>
              </svg>
              <div
                style={{
                  borderTopStyle: 'none',
                  bottom: '1px',
                  left: '0px',
                  margin: '-1px 24px',
                  right: '0px',
                  position: 'absolute'
                }}
              ></div>
              <div
                style={{
                  boxSizing: 'borderBox',
                  clear: 'both',
                  display: 'table'
                }}
              > </div>
            </div>
          </div>
          <div>
            <hr
              style={{
                borderBottomWidth: '1px',
                borderStyle: 'none none solid',
                borderColor: 'rgb(224, 224, 224)',
                bottom: '8px',
                boxSizing: 'content-box',
                margin: '0px',
                position: 'absolute',
                width: '100%'
              }}
            />
            <hr
              style={{
                borderBottomWidth: '2px',
                borderStyle: 'none none solid',
                borderColor: 'rgb(33, 150, 243)',
                bottom: '8px',
                boxSizing: 'content-box',
                margin: '0px',
                position: 'absolute',
                width: '100%',
                transform: 'scaleX(0)',
                transition: 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms'
              }}
            />
          </div>
        </div>
      );
    } else {
      return (
        <SelectField
          value={value}
          autoWidth={autoWidth}
          floatingLabelText={floatingLabelText}
          onChange={(e, i, v) => onChange(v)}
        >
          {options.map(({value, label, leftIcon, rightIcon, disabled}) =>
            <MenuItem
              key={value}
              value={value}
              primaryText={<div className="dropdown-option">{label || value}</div>}
              leftIcon={leftIcon}
              rightIcon={rightIcon}
              disabled={disabled}
            />
          )}
        </SelectField>
      );
    }

  }

});

module.exports = SelectFieldWithNativeFallback;

import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import TextField from '@material-ui/core/TextField';
import _map from 'lodash.map';
import Button from 'ui/Button';
import Icon from 'ui/Icon';

let ModalInput = createReactClass({
  displayName: 'ModalInput',
  mixins: [PureRenderMixin],

  propTypes: {
    inputs: PropTypes.array.isRequired,
    names: PropTypes.array.isRequired,
    action: PropTypes.string.isRequired,
    actionIcon: PropTypes.string,
    onAction: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
  },

  render() {
    let {inputs, names, action, onAction, onCancel} = this.props;
    return (
      <div className="centering-container vertical stack">
        {_map(inputs, (input, i) =>
          <TextField key={input}
            autoFocus
            label={names[i]}
            ref={input}/>
        )}
        <div className="centering-container horizontal stack">
          <Button
            label="Cancel"
            color="primary"
            iconName="close"
            onClick={onCancel}
          />
          <Button
            raised="true"
            autoFocus={true}
            style={{marginRight: '10px'}}
            label={action}
            color="primary"
            iconName="check"
            iconInverse={true}
            onClick={() => {
              let values = {};
              _map(inputs, (input) => values[input] = this.refs[input].input.value);
              onAction(values);
            }}
          />
        </div>
      </div>
    );
  },
});

export default ModalInput;

import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import TextField from 'material-ui/TextField';
import _map from 'lodash.map';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
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
            floatingLabelText={names[i]}
            ref={input}/>
        )}
        <div className="centering-container horizontal stack">
          <FlatButton
            label="Cancel"
            primary={false}
            icon={<Icon name="close" inverse={false} />}
            onClick={onCancel}
          />
          <RaisedButton
            autoFocus={true}
            style={{marginRight: '10px'}}
            label={action}
            primary={true}
            icon={<Icon name="check" inverse={true} />}
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

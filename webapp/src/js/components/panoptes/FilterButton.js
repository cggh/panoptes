import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import {FlatButton} from 'material-ui';
import SQL from 'panoptes/SQL';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';

let FilterButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
  ],

  propTypes: {
    query: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    onPick: React.PropTypes.func.isRequired,
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
    };
  },

  handlePick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.onPick(query);
  },

  render() {
    const {query, table, name} = this.props;
    let decodedQuery = SQL.WhereClause.decode(query);

    return <div>
      <FlatButton label={decodedQuery.isTrivial ? `Add ${name || ''} Filter` : `Change ${name || ''} Filter`}
                  primary={true}
                  onClick={() => this.getFlux().actions.session.modalOpen('containers/QueryPicker',
                    {
                      table,
                      initialQuery: query,
                      onPick: this.handlePick
                    })}
                  icon={<Icon fixedWidth={true} name="filter" />}
      />
      {decodedQuery.isTrivial ? null :
        <FlatButton
          label={`Clear ${name || ''} Filter`}
          primary={true}
          onClick={() => {
            this.handlePick(SQL.nullQuery);
          }}
          icon={<span className={'fa-stack'}><Icon style={{position: 'absolute', color: 'rgb(153, 200, 236)'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span>}
        />
      }

    </div>;
  }

});

export default FilterButton;

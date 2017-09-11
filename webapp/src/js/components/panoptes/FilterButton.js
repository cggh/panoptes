import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Button from 'ui/Button';
import SQL from 'panoptes/SQL';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';
import QueryPicker from 'containers/QueryPicker';

let FilterButton = createReactClass({
  displayName: 'FilterButton',

  mixins: [
    PureRenderMixin,
    FluxMixin,
  ],

  propTypes: {
    query: PropTypes.string,
    table: PropTypes.string.isRequired,
    onPick: PropTypes.func.isRequired,
    name: PropTypes.string
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
      <Button
        label={decodedQuery.isTrivial ? `Add ${name || ''} Filter` : `Change ${name || ''} Filter`}
        color="primary"
        onClick={() => this.getFlux().actions.session.modalOpen(<QueryPicker
          table={table}
          initialQuery={query}
          onPick={this.handlePick}
        />)}
        iconName="filter"
      />
      {decodedQuery.isTrivial ? null :
        <Button
          label={`Clear ${name || ''} Filter`}
          color="primary"
          onClick={() => {
            this.handlePick(SQL.nullQuery);
          }}
          icon={<span className={'fa-stack'}><Icon style={{position: 'absolute', color: 'rgb(153, 200, 236)'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span>}
        />
      }

    </div>;
  },
});

export default FilterButton;

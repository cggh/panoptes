import _clone from 'lodash/clone';
import _find from 'lodash/find';
import _map from 'lodash/map';

import React from 'react';
import classNames from 'classnames';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

import SQL from 'panoptes/SQL';
import Formatter from 'panoptes/Formatter';
import Deformatter from 'panoptes/Deformatter';
import RaisedButton from 'material-ui/RaisedButton';
import Paper from 'material-ui/Paper';
import Icon from 'ui/Icon';


let Component = React.createClass({
  render() {
    let {component} = this.props;
    if (component.type === 'AND')
      return <And {...this.props}/>;
    else if (component.type === 'OR')
      return <Or {...this.props}/>;
    else
      return <Criterion {...this.props}/>;
  }
});

let And = React.createClass({
  render() {
    let {component, ...other} = this.props;
    return (
      <div className="and">
        {component.components.map((subComponent, key) => <Component {...other} key={key} component={subComponent}/>)}
      </div>
    );
  }
});

let Or = React.createClass({
  render() {
    let {component, ...other} = this.props;
    return (
      <div className="or">
        <div className="startline">OR</div>
        <div className="components">
          {component.components.map((subComponent, key) =>
            <div key={key} className="or-criteria-wrapper">
              <Component {...other} component={subComponent}/>
            </div>
          )}
        </div>
        <div className="endline"></div>
      </div>
    );
  }
});

let Criterion = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderMixin,
    StoreWatchMixin('PanoptesStore')
  ],


  getStateFromFlux() {
    return {
      subsets: this.getFlux().store('PanoptesStore').getStoredSubsetsFor(this.props.table)
    };
  },

  handleReplaceTrivial() {
    let {component, onChange} = this.props;

    // Get the property info for this table's primary key.
    let property = this.tableConfig().propertiesById[this.tableConfig().primKey];

    // Get the valid operators for this table's primary key.
    let validOperators = SQL.WhereClause.getCompatibleFieldComparisonOperators(property.encodingType);

    // Create a new clean component, based on the first valid operator for this table's primary key.
    let newComponent = _find(SQL.WhereClause._fieldComparisonOperators, {ID: validOperators[0].ID}).Create();

    // Set the new component's primary column name to this table's primary key.
    newComponent.ColName = this.tableConfig().primKey;

    // Set the new component's isTrivial to false, i.e. the query will no longer be SELECT * FROM table.
    newComponent.isTrivial = false;

    // Wipe the state clean.
    // NB: setting to undefined causes warning "changing an uncontrolled input of type undefined to be controlled"
    ['CompValue', 'CompValueMin', 'CompValueMax', 'Offset', 'Factor'].forEach((name) => {
      this.setState({[name]: ''});
    });

    // Swap the specified component for the new component.
    Object.assign(component, newComponent);

    onChange();
  },

  handleRemove() {
    let {component, onChange} = this.props;
    if (component.isRoot) {
      Object.assign(component, SQL.WhereClause.Trivial());
    } else {
      component.parent.removeChild(component);
    }
    onChange();
  },

  newComponent() {
    return SQL.WhereClause.CompareFixed(this.tableConfig().primKey, '=', '');
  },

  handleAddOr() {
    let {component, onChange} = this.props;
    if (component.isRoot || component.parent.type == 'AND') {
      let newOr = SQL.WhereClause.Compound('OR');
      let child = _clone(component);
      child.isRoot = false;
      newOr.addComponent(child);
      newOr.addComponent(this.newComponent());
      newOr.parent = component.parent;
      newOr.isRoot = component.isRoot;
      Object.assign(component, newOr);
    } else {
      component.parent.addComponent(this.newComponent());
    }
    onChange();
  },

  handleAddAnd() {
    let {component, onChange} = this.props;
    if (component.isRoot || component.parent.type == 'OR') {
      let newAnd = SQL.WhereClause.Compound('AND');
      let child = _clone(component);
      child.isRoot = false;
      newAnd.addComponent(child);
      newAnd.addComponent(this.newComponent());
      newAnd.parent = component.parent;
      newAnd.isRoot = component.isRoot;
      Object.assign(component, newAnd);
    } else {
      component.parent.addComponent(this.newComponent());
    }
    onChange();
  },

  validateOperatorAndValues() {
    let {component} = this.props;

    // Create a new clean component, based on the current component's type.
    let newComponent = _find(SQL.WhereClause._fieldComparisonOperators, {ID: component.type}).Create();

    // Copy over the current component's column name properties to the new component, to preserve them.
    ['ColName', 'ColName2'].forEach((name) => {
      if (component[name] !== undefined) {
        newComponent[name] = component[name];
      }
    });

    // Get the property info for the new component's primary column.
    let property = this.tableConfig().propertiesById[newComponent.ColName];

    // Copy over the comparison(?) value properties, either from the the current component or otherwise the state, to the new component, to preserve them.
    ['CompValue', 'CompValueMin', 'CompValueMax'].forEach((name) => {
      if (component[name] !== undefined) {
        newComponent[name] = Deformatter(property, Formatter(property, component[name]));
      } else if (this.state[name] !== undefined) {
        newComponent[name] = Deformatter(property, this.state[name]);
      }
    });

    if (component.Offset || this.state.Offset)
      newComponent.Offset = component.Offset || this.state.Offset;
    if (component.Factor || this.state.Factor)
      newComponent.Factor = component.Factor || this.state.Factor;
    if (component.Subset || this.state.subsets[0])
      newComponent.Subset = component.Subset || this.state.subsets[0];

    Object.assign(component, newComponent);
  },

  handlePropertyChange() {
    let {component, onChange} = this.props;
    component.ColName = this.refs.property.value;
    let property = this.tableConfig().propertiesById[component.ColName];
    let validOperators = SQL.WhereClause.getCompatibleFieldComparisonOperators(property.encodingType);

    // If the currentOperator is one of the validOperators for the new property,
    // then continue to use it.
    let currentOperator = validOperators.filter((op) => op.ID === component.type)[0];
    // Otherwise use the first of the validOperators for the new property.
    if (!currentOperator)
      component.type = validOperators[0].ID;

    // If there is still no operator, then throw a wobbly.
    if (!currentOperator)
      throw Error('SQL criterion operator not valid');

    //// Update the comparison values to suit the new property type.

    // TODO: Implement peristent values for compatible properties?

    component.CompValue = undefined;
    component.CompValue2 = undefined;
    component.CompValueMin = undefined;
    component.CompValueMax = undefined;
    component.Factor = undefined;
    component.Offset = undefined;
    component.subset = undefined;

    // TODO: This logic is essentially replicated from render(). Possible to abstract?
    if (currentOperator.fieldType === 'value') {
      if (property.propCategories) {
        component.CompValue = property.propCategories[0];
      } else if (property.isBoolean) {
        component.CompValue = 1;
      }
    }

    this.validateOperatorAndValues();
    onChange();
  },

  handleOperatorChange() {
    let {component, onChange} = this.props;
    component.type = this.refs.operator.value;
    this.validateOperatorAndValues();
    onChange();
  },

  handleValueChange() {
    let {component, onChange} = this.props;
    let property = this.tableConfig().propertiesById[component.ColName];
    let validOperators = SQL.WhereClause.getCompatibleFieldComparisonOperators(property.encodingType);

    let currentOperator = validOperators.filter((op) => op.ID === component.type)[0];
    if (!currentOperator) {
      throw Error('SQL criterion operator not valid');
    }

    if (currentOperator.fieldType === 'value') {
      component.CompValue = Deformatter(property, this.refs.value.value);
      this.setState({CompValue: this.refs.value.value});
    } else if (currentOperator.fieldType === 'minMax') {
      component.CompValueMin = Deformatter(property, this.refs.min.value);
      component.CompValueMax = Deformatter(property, this.refs.max.value);
      this.setState({
        CompValueMin: this.refs.min.value,
        CompValueMax: this.refs.max.value
      });
    } else if (currentOperator.fieldType === 'otherColumn') {
      component.ColName2 = this.refs.otherColumn.value;
    } else if (currentOperator.fieldType === 'otherColumnWithScaleAndOffset') {
      component.ColName2 = this.refs.otherColumn.value;
      component.Factor = this.refs.scale.value;
      component.Offset = this.refs.offset.value;
      this.setState({
        Factor: this.refs.min.value,
        Offset: this.refs.max.value
      });
    } else if (currentOperator.fieldType === 'subset') {
      component.Subset = this.refs.subset.value;
    }

    onChange();
  },

  render() {
    let {component} = this.props;

    if (component.isTrivial)
      return (
        <div className="criterion">
          <RaisedButton label="Add Criterion"
                        onClick={this.handleReplaceTrivial}/>
        </div>
      );

    let groups = _clone(this.tableConfig().propertyGroups);
    groups.other = {
      id: 'other',
      name: 'Other',
      properties: [{
        id: '_subset_',
        name: 'In subset',
        disabled: (this.state.subsets.size === 0)
      }]
    };
    let propertySelect = (
      <select ref="property" value={component.ColName} onChange={this.handlePropertyChange}>
        {_map(groups, (group) =>
          <optgroup key={group.id} label={group.name}>
            {group.properties.map((property) => {
              let {id, disabled, name} = property;
              return (
                <option key={id}
                        value={id}
                        disabled={disabled}>
                  {name}
                </option>
              );
            })
            }
          </optgroup>
        )}
      </select>
    );

    let property = this.tableConfig().propertiesById[component.ColName];
    let validOperators = SQL.WhereClause.getCompatibleFieldComparisonOperators(property.encodingType);
    let operatorSelect = null;
    if (validOperators.length == 1) {
      operatorSelect = <div className="operator">{validOperators[0].name}</div>;
    } else {
      operatorSelect = (
        <select ref="operator" value={component.type} onChange={this.handleOperatorChange}>
          {validOperators.map((operator) => {
            let {ID, name} = operator;
            return (
                <option key={ID}
                        value={ID}>
                  {name}
                </option>
              );
          }
          )}
        </select>
      );
    }

    let otherColumnSelect = () =>
      <select className="field" ref="otherColumn" value={component.ColName2} onChange={this.handleValueChange}>
          {groups.map((group) => {
            if (group.id === 'other') return null;
            return (
                <optgroup key={group.id} label={group.name}>
                  {group.properties.map((property) => {
                    let {id, disabled, name} = property;
                    return (
                      <option key={id}
                              value={id}
                              disabled={disabled}>
                        {name}
                      </option>
                    );
                  })
                  }
                </optgroup>
              );
          }
          )}
        </select>;

    let fields = null;
    let currentOperator = validOperators.filter((op) => op.ID === component.type)[0];
    if (!currentOperator)
      throw Error('SQL criterion operator not valid');
    if (currentOperator.fieldType === 'value') {
      if (property.propCategories) {
        fields = (
          <div className="fields">
            <select className="field" ref="value"
                    value={component.CompValue}
                    onChange={this.handleValueChange}>
              {property.propCategories.map((cat) =>
                <option key={cat}
                        value={cat}>
                  {cat}
                </option>)
              }
            </select>
          </div>
        );
      } else if (property.isBoolean) {
        fields = (
          <div className="fields">
            <select className="field" ref="value"
                    value={component.CompValue}
                    onChange={this.handleValueChange}>
              <option key="true"
                      value="1">
                Yes
              </option>
              <option key="false"
                      value="0">
                No
              </option>
            </select>
          </div>

        );
      } else {
        fields = (
          <div className="fields">
            <input className="field" ref="value"
                   value={component.CompValue ? Formatter(property, component.CompValue) : this.state.CompValue}
                   onChange={this.handleValueChange}/>
          </div>
        );
      }
    } else if (currentOperator.fieldType === 'minMax') {
      fields = (
        <div className="fields">
          <input className="field" ref="min"
                 value={component.CompValueMin ? Formatter(property, component.CompValueMin) : this.state.CompValueMin}
                 onChange={this.handleValueChange}/>

          <div>and</div>
          <input className="field" ref="max"
                 value={component.CompValueMax ? Formatter(property, component.CompValueMax) : this.state.CompValueMax}
                 onChange={this.handleValueChange}/>
        </div>
      );
    } else if (currentOperator.fieldType === 'otherColumn') {
      fields = (
        <div className="fields">
          {otherColumnSelect()}
        </div>
      );
    } else if (currentOperator.fieldType === 'otherColumnWithScaleAndOffset') {
    //TODO Number validation for these fields
      fields = (
        <div className="fields">
          {otherColumnSelect()}
          <div>x</div>
          <input className="field" ref="scale" value={component.Factor || this.state.Factor}
                 onChange={this.handleValueChange}/>

          <div>+</div>
          <input className="field" ref="offset" value={component.Offset || this.state.Offset}
                 onChange={this.handleValueChange}/>
        </div>
      );
    } else if (currentOperator.fieldType === 'subset') {
      fields = (
        <div className="fields">
          <select className="field" ref="subset" value={component.subset} onChange={this.handleValueChange}>
            {this.state.subsets.toArray().map((subset) => {
              //TODO CHECK AGAINST ACTUAL SUBSET CONTENT
              let {id, name} = subset;
              return (
                <option key={id}
                        value={id}>
                  {name}
                </option>
              );
            })
            }
          </select>

        </div>
      );
    }

    return (
      <Paper zDepth={1} className="criterion">
        <div className="inputs">
          {propertySelect}
          {operatorSelect}
          {fields}
        </div>
        <div className="actions">
          <div>
            <Icon className="pointer close" name="close" onClick={this.handleRemove}/>
          </div>
          <div className="action" onClick={this.handleAddOr}>
            OR
          </div>
          <div className="action" onClick={this.handleAddAnd}>
            AND
          </div>
        </div>
      </Paper>
    );
  }
});


let QueryEditor = React.createClass({
  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    onChange: React.PropTypes.func
  },

  handleChange(newQuery) {
    if (this.props.onChange) {
      newQuery = SQL.WhereClause.encode(newQuery);
      this.props.onChange(newQuery);
    }
  },

  render() {
    let {query, table, className} = this.props;
    query = SQL.WhereClause.decode(query);
    return (
      <div className={classNames('query-editor', className)}>
        <div className="endpoint">Full data set</div>
        <br/>

        <div className="criteria">
          <Component component={query} table={table} onChange={this.handleChange.bind(this, query)}/>
        </div>
        <br/>

        <div className="endpoint">Filtered data set</div>
      </div>
    );
  }

});

module.exports = QueryEditor;

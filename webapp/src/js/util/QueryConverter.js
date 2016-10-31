import React from 'react'; // for JSX
import Formatter from 'panoptes/Formatter';

import SQL from 'panoptes/SQL';

function tableQueryToReactComponent(payload) {

  let defaults = {
    prefix: '',
    query: SQL.nullQuery
  };

  let {prefix, properties, query, subsets, table} = {...defaults, ...payload};

  if (table === undefined) {
    console.error('table === undefined');
    return null;
  }

  let adaptedPrefix = prefix === '' ? prefix : prefix + ' ';
  let decodedQuery = SQL.WhereClause.decode(query);
  let tableQueryAsReactComponent = undefined;

  if ((!decodedQuery) || (decodedQuery.isTrivial)) {
    tableQueryAsReactComponent = <span>{`${adaptedPrefix}No filter`}</span>;
  } else {

    let nameMap = {};
    properties.forEach((property) => {
      nameMap[property.id] = {
        name: property.name,
        toDisplayString: Formatter.bind(this, property)
      };
    });

    let subsetMap = {};
    subsets.map((subset) => {
      subsetMap[subset.id] = {
        name: subset.name
      };
    });

    let queryData = {
      fieldInfoMap: nameMap,
      subsetMap: subsetMap
    };

    tableQueryAsReactComponent = (
      <span>
        { adaptedPrefix + decodedQuery.toQueryDisplayString(queryData, 0) }
      </span>
    );
  }

  return tableQueryAsReactComponent;
}

function tableQueryToString(payload) {

  let defaults = {
    query: SQL.nullQuery
  };

  let {properties, query, table} = {...defaults, ...payload};

  if (table === undefined) {
    console.error('table === undefined');
    return null;
  }

  let decodedQuery = SQL.WhereClause.decode(query);
  let tableQueryAsString = undefined;

  if ((!decodedQuery) || (decodedQuery.isTrivial)) {
    tableQueryAsString = 'No filter';
  } else {

    let nameMap = {};
    properties.forEach((property) => {
      nameMap[property.id] = {
        name: property.name,
        toDisplayString: Formatter.bind(this, property)
      };
    });

    let queryData = {
      fieldInfoMap: nameMap
    };

    tableQueryAsString = decodedQuery.toQueryDisplayString(queryData, 0);
  }

  return tableQueryAsString;
}

module.exports = {
  tableQueryToReactComponent,
  tableQueryToString
};

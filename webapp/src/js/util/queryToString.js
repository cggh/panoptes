import React from 'react'; // for JSX
import Formatter from 'panoptes/Formatter';
import SQL from 'panoptes/SQL';

export default function queryToString({properties, query}) {
  let decodedQuery = SQL.WhereClause.decode(query);
  let tableQueryAsString = undefined;

  if ((!decodedQuery) || (decodedQuery.isTrivial)) {
    return 'No filter';
  }
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

  return decodedQuery.toQueryDisplayString(queryData, 0);
}

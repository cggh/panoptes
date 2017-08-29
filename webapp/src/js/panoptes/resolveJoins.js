export default function resolveJoins(queryAPIargs, config) {
  if (queryAPIargs.joins !== undefined) {
    // If there are joins, make sure we qualify each column name to avoid ambiguity.
    for (let i = 0; i < queryAPIargs.joins.length; i++) {
      let join = queryAPIargs.joins[i];
      if (join.column.indexOf('.') === -1) {
        join.column = `${queryAPIargs.table}.${join.column}`;
      }
      if (join.foreignColumn.indexOf('.') === -1) {
        join.foreignColumn = `${join.foreignTable}.${join.foreignColumn}`;
      }
    }
    // Assume that unqualified columns in the list belong to queryAPIargs.table
    for (let i = 0; i < queryAPIargs.columns.length; i++) {
      if (queryAPIargs.columns[i].indexOf('.') === -1) {
        queryAPIargs.columns[i] = `${queryAPIargs.table}.${queryAPIargs.columns[i]}`;
      }
    }
  } else {
    // Extract implicit joins; joins implied by columns belonging to other tables.
    queryAPIargs.joins = [];
    let foreignTables = [];
    for (let i = 0; i < queryAPIargs.columns.length; i++) {
      let column = queryAPIargs.columns[i];
      if (column.indexOf('.') !== -1) {
        let [tableId] = column.split('.');
        if (tableId !== queryAPIargs.table && foreignTables.indexOf(tableId) === -1) {
          let relation = undefined;
          for (let j = 0; j < config.tablesById[queryAPIargs.table].relationsChildOf.length; j++) {
            if (config.tablesById[queryAPIargs.table].relationsChildOf[j].tableId === tableId) {
              relation = config.tablesById[queryAPIargs.table].relationsChildOf[j];
              break;
            }
          }
          if (relation === undefined) {
            console.error(`There is no relation configured for the child table ${tableId} for parent table ${queryAPIargs.table}.`);
            return;
          }
          let join = {};
          join.type = '';
          join.foreignTable = relation.tableId;
          join.foreignColumn = `${relation.tableId}.${relation.parentTable.primKey}`;
          join.column = `${queryAPIargs.table}.${relation.childPropId}`;
          queryAPIargs.joins.push(join);
          foreignTables.push(tableId);
        }
      }
    }
    if (queryAPIargs.joins.length === 0) {
      queryAPIargs.joins = undefined;
    }
  }
  return queryAPIargs;
}

export default function resolveJoins(queryAPIargs, config) {
  if (queryAPIargs.joins !== undefined) {
    // If there are joins, make sure we qualify each column name to avoid ambiguity.
    for (let i = 0; i < queryAPIargs.joins.length; i++) {
      let join = queryAPIargs.joins[i];
      if (typeof join.column === 'string' && join.column.indexOf('.') === -1) {
        join.column = `${queryAPIargs.table}.${join.column}`;
      }
      if (typeof join.foreignColumn === 'string' && join.foreignColumn.indexOf('.') === -1) {
        join.foreignColumn = `${join.foreignTable}.${join.foreignColumn}`;
      }
    }
  } else {
    // Extract implicit joins; joins implied by columns belonging to other tables.
    queryAPIargs.joins = [];
    let foreignTables = [];
    for (let i = 0; i < queryAPIargs.columns.length; i++) {
      let column = queryAPIargs.columns[i];
      if (column.expr) {
        column = column.expr;
      }
      if (typeof column === 'string' && column.indexOf('.') !== -1) {
        // Get the tableId from the qualified column Id.
        let [tableId] = column.split('.');
        // If the column's table Id isn't the native table
        // and if column's table Id isn't already in our list of foreignTables...
        if (tableId !== queryAPIargs.table && foreignTables.indexOf(tableId) === -1) {
          let relation = undefined;
          // For all of the relations of the native table...
          for (let j = 0; j < config.tablesById[queryAPIargs.table].relationsChildOf.length; j++) {
            // If there is a relation that matches the column's table Id...
            if (config.tablesById[queryAPIargs.table].relationsChildOf[j].tableId === tableId) {
              // Set the relation to the relation matching the columns table Id.
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
  //If we have any joins then qualify the unqualified names as belonging to the root table - alias them so this is transparent to calling code.
  if (queryAPIargs.joins && queryAPIargs.joins.length !== 0) {
    queryAPIargs.columns = queryAPIargs.columns.map((column) => {
      if (typeof column === 'string' && column.indexOf('.') === -1) {
        return {expr: `${queryAPIargs.table}.${column}`, as: column};
      } else {
        return column;
      }
    });
  }
  return queryAPIargs;
}

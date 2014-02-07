define([],
    function () {
        return function TwoDCache(table, property_list, col_query, row_query, col_order, row_order) {
            var that = {};
            that.init = function(table, property_list, col_query, row_query, col_order, row_order) {
                that.table = table;
                that.property_list = property_list;
                that.col_query = col_query;
                that.row_query = row_query;
                that.col_order = col_order;
                that.row_order = row_order;
            };

            that.init(table, property_list, col_query, row_query, col_order, row_order);
            return that
        };
    }
);
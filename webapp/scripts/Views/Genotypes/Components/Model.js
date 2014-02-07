define([],
    function () {
        return function Model(table_info, col_query, row_query, col_order, row_order) {
            var that = {};
            that.init = function(table_info, col_query, row_query, col_order, row_order) {
                that.table = table_info;
                that.row_query = row_query;
                that.col_query = col_query;
                that.row_order = row_order;
                that.col_order = col_order;
            };

            that.init(table_info, col_query, row_query, col_order, row_order);
            return that
        };
    }
);
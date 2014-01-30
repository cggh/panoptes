define(["DQX/Utils", "DQX/SQL", "MetaData", "DQX/ArrayBufferClient"],
    function (DQX, SQL, MetaData, ArrayBufferClient) {
        var Query2D = {};
        Query2D.request = function (datatable, property, col_qry, row_qry, col_order, row_order) {
            var myurl = DQX.Url(MetaData.serverUrl);
            myurl.addUrlQueryItem("datatype", "custom");
            myurl.addUrlQueryItem("respmodule", "2d_server");
            myurl.addUrlQueryItem("respid", "2d_query");
            myurl.addUrlQueryItem('dataset', MetaData.database);
            myurl.addUrlQueryItem('dataset', datatable);
            myurl.addUrlQueryItem('dataset', property);
            myurl.addUrlQueryItem("col_qry", SQL.WhereClause.encode(col_query));
            myurl.addUrlQueryItem("row_qry", SQL.WhereClause.encode(row_query));
            myurl.addUrlQueryItem("col_order", col_order);
            myurl.addUrlQueryItem("row_order", row_order);
            ArrayBufferClient.request(myurl.toString(),
                callback,
                function (error) {
                    callback(null);
                }
            );
        };
        return Query2D;
    }
);


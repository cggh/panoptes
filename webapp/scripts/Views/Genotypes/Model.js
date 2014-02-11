define(["Utils/TwoDCache", "MetaData", "DQX/ArrayBufferClient", "DQX/SQL"],
    function (TwoDCache, MetaData, ArrayBufferClient, SQL) {
        return function Model(table_info,
                              col_query,
                              row_query,
                              col_order,
                              row_order,
                              properties,
                              chromosomes) {
            var that = {};
            that.init = function(table_info,
                                 col_query,
                                 row_query,
                                 col_order,
                                 row_order,
                                 properties,
                                 chromosomes) {
                that.table = table_info;
                that.row_query = row_query;
                that.col_query = col_query;
                that.row_order = row_order;
                that.col_order = col_order;
                that.properties = properties;
                that.chromosomes = chromosomes;

                that.reset_cache();
            };

            that.reset_cache = function() {
                //Create a cache for each chrom
                that.cache_for_chrom = {};
                _.each(that.chromosomes, function (chrom) {
                    that.cache_for_chrom[chrom] = TwoDCache(
                        that.col_order,
                        properties,
                        function(start, end, callback) {
                            that.data_provider(chrom, start, end, callback);
                        }
                    )
                });
            };

            that.data_provider = function(chrom, start, end, callback) {
                if (query == undefined || query == null) {
                    callback([]);
                    return;
                }
                var query = SQL.WhereClause.AND([query,
                    SQL.WhereClause.CompareFixed('chrom', '=', chrom),
                    SQL.WhereClause.CompareFixed('pos', '>=', start),
                    SQL.WhereClause.CompareFixed('pos', '<', end)]);
                var myurl = DQX.Url(MetaData.serverUrl);
                myurl.addUrlQueryItem("datatype", "custom");
                myurl.addUrlQueryItem("respmodule", "2d_server");
                myurl.addUrlQueryItem("respid", "dim_index");
                myurl.addUrlQueryItem('database', MetaData.database);
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(query));
                myurl.addUrlQueryItem("tbname", that.table.col_table.id);
                myurl.addUrlQueryItem("field", that.table.col_order);
                ArrayBufferClient.request(myurl.toString(),
                    function(data) {
                        var elements = _.map(data, function(ele) {
                            var a = {};
                            a[that.table.col_order] = ele;
                            return a;
                        });
                        callback(start, end, elements);
                    },
                    function(error) {
                        console.log(error);
                        callback(null);
                    }
                );
            };

            that.get_range = function(chrom, start, end) {
                
            }

            that.init(table_info,
                      col_query,
                      row_query,
                      col_order,
                      row_order,
                      properties,
                      chromosomes);
            return that
        };
    }
);
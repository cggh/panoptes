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
                var col_query = that.col_query;
                if (col_query.isTrivial)
                    col_query = [];
                else
                    col_query = [col_query];
                //TODO Dynamic chrom field
                col_query.push(SQL.WhereClause.CompareFixed('chrom', '=', chrom));
                col_query.push(SQL.WhereClause.CompareFixed(that.col_order, '>=', start));
                col_query.push(SQL.WhereClause.CompareFixed(that.col_order, '<', end));
                col_query = SQL.WhereClause.AND(col_query);
                var myurl = DQX.Url(MetaData.serverUrl);
                myurl.addUrlQueryItem("datatype", "custom");
                myurl.addUrlQueryItem("respmodule", "2d_server");
                myurl.addUrlQueryItem("respid", "2d_query");
                myurl.addUrlQueryItem('dataset', MetaData.database);
                myurl.addUrlQueryItem('datatable', that.table.id);
                myurl.addUrlQueryItem("col_qry", SQL.WhereClause.encode(col_query));
                myurl.addUrlQueryItem("row_qry", SQL.WhereClause.encode(row_query));
                myurl.addUrlQueryItem("col_order", that.col_order);
                myurl.addUrlQueryItem("row_order", that.row_order);
                myurl.addUrlQueryItem("col_properties", that.col_order);
                myurl.addUrlQueryItem("row_properties", that.row_order);
                myurl.addUrlQueryItem("2D_properties", _.keys(that.properties).join('~'));
                ArrayBufferClient.request(myurl.toString(),
                    function(data) {
                        callback(start, end, data);
                    },
                    function(error) {
                        callback(start, end, null);
                    }
                );
            };

            that.get_range = function(chrom, start, end) {
                return that.cache_for_chrom[chrom].get_by_pos(start, end);
            };

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
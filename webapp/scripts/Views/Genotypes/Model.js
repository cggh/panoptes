define(["Utils/TwoDCache", "MetaData", "DQX/ArrayBufferClient", "DQX/SQL"],
    function (TwoDCache, MetaData, ArrayBufferClient, SQL) {
        return function Model(table_info,
                              query,
                              chromosomes,
                              update_callback) {
            var that = {};
            that.init = function(table_info,
                                 query,
                                 chromosomes,
                                 update_callback) {
                that.table = table_info;
                that.query = query;
                that.chromosomes = chromosomes;
                that.update_callback = update_callback;

                that.first_col_ordinal = 0;
                that.last_col_ordinal = 0;

                that.data = {};
                that.settings = table_info.settings.ShowInGenomeBrowser;
                that.data_type = that.settings.Type;
                if (that.data_type != 'diploid' && that.data_type != 'fractional')
                    DQX.reportError("Genotype data type is not diploid or fractional");
                if (that.data_type == 'diploid') {
                    that.properties = [that.settings.FirstAllele, that.settings.SecondAllele];
                    _.each(that.settings.ExtraProperties, function(prop) {
                        that.properties.push(prop);
                    });
                }
                if (that.data_type == 'fractional') {
                    that.properties = [that.settings.RefFraction];
                    _.each(that.settings.ExtraProperties, function(prop) {
                        that.properties.push(prop);
                    });

                }
                that.reset_cache();

            };

            that.reset_cache = function() {
                //Create a cache for each chrom
                that.cache_for_chrom = {};
                _.each(that.chromosomes, function (chrom) {
                    that.cache_for_chrom[chrom] = TwoDCache(
                        that.query.col_order,
                        function(start, end, callback) {
                            that.data_provider(chrom, start, end, callback);
                        },
                        function () {
                            //Grab the new data from the cache
                            that.refresh_data();
                        }
                    )
                });
                that.col_ordinal = [];
                that.row_ordinal = [];
                _.each(that.properties, function(prop) {
                  that.data[prop] = [];
                });
                that.col_positions = [];
                that.col_width = 0;
                that.row_index = [];
                that.genomic_start = 0;
                that.genomic_end = 0;
            };

            that.position_columns  = function(ordinal, width) {
                var result = new Float32Array(ordinal);
                for (var cf = 0.1; cf <= 1; cf += 0.1) {
                    var psxlast = -Infinity;
                    for (var i = 0, ref = result.length; i < ref; i++) {
                        if (result[i] < psxlast + cf * width)
                            result[i] = psxlast + cf * width;
                        psxlast = result[i];
                    }
                    cf += 0.1;
                    psxlast = Infinity;
                    for (i = result.length - 1; i >= 0; i--) {
                        if (result[i] > psxlast - cf * width)
                            result[i] = psxlast - cf * width;
                        psxlast = result[i];
                    }
                }
                psxlast = -Infinity;
                for (i = 0, ref = result.length; i < result.length; i++) {
                    result[i] = Math.round(result[i]);
                    if (result[i] < psxlast + width)
                        result[i] = psxlast + width;
                    psxlast = result[i];
                }
                var avg_shift = 0;
                for (i = 0, ref = result.length; i < result.length; i++) {
                    avg_shift += result[i] - ordinal[i];
                }
                avg_shift /= result.length;
                for (i = 0, ref = result.length; i < result.length; i++) {
                    result[i] -= avg_shift;
                }
                return result;
            };

            that.refresh_data = function() {
                var overdraw = (that.col_end - that.col_start)*0.05;
                var data = that.cache_for_chrom[that.chrom].get_by_ordinal(that.col_start-overdraw,  that.col_end+overdraw);
                that.col_ordinal = data.col[that.query.col_order] || [];
                that.row_ordinal = data.row[that.query.row_order] || [];
                that.row_primary_key = data.row[that.table.row_table.primkey] || [];
                that.col_primary_key = data.col[that.table.col_table.primkey] || [];
                _.each(that.properties, function(prop) {
                    that.data[prop] = data.twoD[prop] || [];
                });
                if (that.col_ordinal.length > 0)
                //For now make it 0.75 of the width as we don't have equidistant blocks
                //that.col_width = 0.75*((that.col_ordinal[that.col_ordinal.length-1] - that.col_ordinal[0]) / that.col_ordinal.length);
                    that.col_width = 3;
                else
                    that.col_width = 0;

                that.col_positions = that.position_columns(that.col_ordinal, that.col_width);

                //TODO Set row index by sort
                if (that.row_ordinal.length > 0)
                    that.row_index = _.times(that.row_ordinal.length, function (i) {return i;});
                else
                    that.row_index = [];
                that.update_callback();
            }

            that.change_col_range = function(chrom, start, end) {
                that.chrom = chrom;
                that.col_start = start;
                that.col_end = end;
                that.refresh_data();
            };

            that.new_col_query = function(q) {
                that.query.col_query = q;
                that.reset_cache();
            };

            that.new_row_query = function(q) {
                that.query.row_query = q;
                that.reset_cache();
            };

            that.data_provider = function(chrom, start, end, callback) {
                //Modify the horizontal query to just the requested window
                var col_query = that.query.col_query;
                if (col_query.isTrivial)
                    col_query = [];
                else
                    col_query = [col_query];
                col_query.push(SQL.WhereClause.CompareFixed('chrom', '=', chrom));
                col_query.push(SQL.WhereClause.CompareFixed(that.query.col_order, '>=', start));
                col_query.push(SQL.WhereClause.CompareFixed(that.query.col_order, '<', end));
                col_query = SQL.WhereClause.AND(col_query);
                var myurl = DQX.Url(MetaData.serverUrl);
                myurl.addUrlQueryItem("datatype", "custom");
                myurl.addUrlQueryItem("respmodule", "2d_server");
                myurl.addUrlQueryItem("respid", "2d_query");
                myurl.addUrlQueryItem('dataset', MetaData.database);
                myurl.addUrlQueryItem('datatable', that.table.id);
                myurl.addUrlQueryItem("col_qry", SQL.WhereClause.encode(col_query));
                myurl.addUrlQueryItem("row_qry", SQL.WhereClause.encode(that.query.row_query));
                myurl.addUrlQueryItem("col_order", that.query.col_order);
                myurl.addUrlQueryItem("row_order", that.query.row_order);
                myurl.addUrlQueryItem("first_dimension", that.table.first_dimension);
                if (that.table.col_table.primkey == that.query.col_order)
                  myurl.addUrlQueryItem("col_properties", that.query.col_order);
                else
                  myurl.addUrlQueryItem("col_properties", that.query.col_order+'~'+that.table.col_table.primkey);
                if (that.table.row_table.primkey == that.query.row_order)
                  myurl.addUrlQueryItem("row_properties", that.query.row_order);
                else
                  myurl.addUrlQueryItem("row_properties", that.query.row_order+'~'+that.table.row_table.primkey);
                myurl.addUrlQueryItem("2D_properties", that.properties.join('~'));
                ArrayBufferClient.request(myurl.toString(),
                    function(data) {
                        callback(start, end, data);
                    },
                    function(error) {
                        callback(start, end, null);
                    }
                );
            };

            that.init(table_info,
                      query,
                      chromosomes,
                      update_callback);
            return that
        };
    }
);

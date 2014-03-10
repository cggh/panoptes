define(["Utils/TwoDCache", "MetaData", "DQX/ArrayBufferClient", "DQX/SQL"],
    function (TwoDCache, MetaData, ArrayBufferClient, SQL) {
        return function Model(table_info,
                              col_query,
                              row_query,
                              col_order,
                              row_order,
                              chromosomes,
                              update_callback) {
            var that = {};
            that.init = function(table_info,
                                 col_query,
                                 row_query,
                                 col_order,
                                 row_order,
                                 chromosomes,
                                 update_callback) {
                that.table = table_info;
                that.row_query = row_query;
                that.col_query = col_query;
                that.row_order = row_order;
                that.col_order = col_order;
                that.chromosomes = chromosomes;
                that.update_callback = update_callback;

                that.first_col_ordinal = 0;
                that.last_col_ordinal = 0;

                that.data_type = table_info.settings.ShowInGenomeBrowser.Type;
                if (that.data_type != 'diploid' && that.data_type != 'fractional')
                    DQX.reportError("Genotype data type is not diploid or fractional");
                if (that.data_type == 'diploid') {
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.first_allele_property = table_info.settings.ShowInGenomeBrowser.FirstAllele;
                    that.second_allele_property = table_info.settings.ShowInGenomeBrowser.SecondAllele;
                    that.properties = [that.depth_property, that.first_allele_property, that.second_allele_property];
                }
                if (that.data_type == 'fractional') {
                    that.ref_fraction_property = table_info.settings.ShowInGenomeBrowser.RefFraction;
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.properties = [that.depth_property, that.ref_fraction_property];
                }
                that.reset_cache();

            };

            that.reset_cache = function() {
                //Create a cache for each chrom
                that.cache_for_chrom = {};
                _.each(that.chromosomes, function (chrom) {
                    that.cache_for_chrom[chrom] = TwoDCache(
                        that.col_order,
                        function(start, end, callback) {
                            that.data_provider(chrom, start, end, callback);
                        },
                        that.update_callback
                    )
                });
                that.col_ordinal = [];
                that.row_ordinal = [];
                if (that.data_type == 'diploid') {
                    that.depth = [];
                    that.first_allele = [];
                    that.second_allele = [];
                }
                if (that.data_type == 'fractional') {
                    that.ref_fraction = [];
                    that.depth = [];
                }

                that.col_positions = [];
                that.col_width = 0;
                that.row_index = [];

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
                return result;
            };

            that.change_col_range = function(chrom, start, end) {
                var data = that.cache_for_chrom[chrom].get_by_ordinal(start, end);
                that.col_ordinal = data.col[that.col_order] || [];
                that.row_ordinal = data.row[that.row_order] || [];

                if (that.data_type == 'diploid') {
                    that.depth = data.twoD[that.depth_property] || [];
                    that.first_allele = data.twoD[that.first_allele_property] || [];
                    that.second_allele = data.twoD[that.second_allele_property] || [];
                }
                if (that.data_type == 'fractional') {
                    that.depth = data.twoD[that.depth_property] || [];
                    that.ref_fraction = data.twoD[that.ref_fraction_property] || [];
                }

                if (that.col_ordinal.length > 0)
                    //For now make it 0.75 of the width as we don't have equidistant blocks
                    that.col_width = 0.75*((that.col_ordinal[that.col_ordinal.length-1] - that.col_ordinal[0]) / that.col_ordinal.length);
                else
                    that.col_width = 0;
                //TODO Assign x locations for each col - for now just copy
                that.col_positions = that.position_columns(that.col_ordinal, that.col_width);


                //TODO Set row index by sort
                if (that.row_ordinal.length > 0)
                    that.row_index = _.times(that.row_ordinal.length, function (i) {return i;});
                else
                    that.row_index = [];
                that.update_callback();
            };
            //Throttle this so that we don't clog the redraw
            that.change_col_range = _.throttle(that.change_col_range, 200);

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
                col_query,
                row_query,
                col_order,
                row_order,
                chromosomes,
                update_callback);
            return that
        };
    }
);
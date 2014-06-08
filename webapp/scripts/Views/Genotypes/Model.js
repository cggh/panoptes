// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["_", "Utils/TwoDCache", "MetaData", "DQX/ArrayBufferClient", "DQX/SQL"],
    function (_, TwoDCache, MetaData, ArrayBufferClient, SQL) {
        return function Model(table_info,
                              query,
                              chromosomes,
                              update_callback,
                              initial_params) {
            var that = {};
            that.init = function(table_info,
                                 query,
                                 chromosomes,
                                 update_callback,
                                 initial_params) {
                that.table = table_info;
                that.query = query;
                that.chromosomes = chromosomes;
                that.update_callback = update_callback;

                that.first_col_ordinal = 0;
                that.last_col_ordinal = 0;
                //Vars set by params
                _.extend(that, initial_params);
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

            that.update_params = function(view_params){
              _.extend(that, view_params);
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

            that.position_columns = function (ordinal) {
              var result = new Float64Array(ordinal);

              if (that.width_mode == 'manual')
                that.col_width = that.user_column_width;
              if (that.width_mode == 'auto') {
                if (that.col_ordinal.length > 0)
                  that.col_width = Math.max(3, (0.70 * ((that.col_end - that.col_start) / that.col_ordinal.length)));
                else
                  that.col_width = 0;
              }
              var width = that.col_width;

              if (that.width_mode == 'auto' || that.width_mode == 'manual') {
                var mid_index = Math.floor(result.length / 2);
                for (var cf = 0.1; cf <= 1; cf += 0.1) {
                  //Sweep middle out
                  var psxlast = result[mid_index];
                  for (var i = mid_index + 1, ref = result.length; i < ref; i++) {
                    if (result[i] < psxlast + cf * width)
                      result[i] = psxlast + cf * width;
                    psxlast = result[i];
                  }
                  psxlast = result[mid_index];
                  for (i = mid_index - 1; i >= 0; i--) {
                    if (result[i] > psxlast - cf * width)
                      result[i] = psxlast - cf * width;
                    psxlast = result[i];
                  }
                  cf += 0.1;
                  //Sweep edges in
                  psxlast = -Infinity;
                  for (i = 0, ref = mid_index; i < ref; i++) {
                    if (result[i] < psxlast + cf * width)
                      result[i] = psxlast + cf * width;
                    psxlast = result[i];
                  }
                  psxlast = Infinity;
                  for (i = result.length - 1; i >= mid_index; i--) {
                    if (result[i] > psxlast - cf * width)
                      result[i] = psxlast - cf * width;
                    psxlast = result[i];
                  }
                }

                psxlast = -Infinity;
                for (i = 0, ref = result.length; i < result.length; i++) {
                  if (result[i] < psxlast + width)
                    result[i] = psxlast + width;
                  psxlast = result[i];
                }
                return result;
              }

              if (that.width_mode == 'fill') {
                that.col_width = (that.col_end - that.col_start) / that.col_ordinal.length;
                for (i = 0, ref = result.length; i < result.length; i++) {
                  result[i] = that.col_start + (i*that.col_width) + that.col_width/2;
                }
                return result;
              }
              DQX.reportError("Invalid width_mode")
            };

            that.refresh_data = function() {
                var overdraw = (that.col_end - that.col_start)*0.00;
                var data = that.cache_for_chrom[that.chrom].get_by_ordinal(that.col_start-overdraw,  that.col_end+overdraw);
                that.col_ordinal = data.col[that.query.col_order] || [];
                that.row_ordinal = data.row[that.query.row_order] || [];
                that.row_primary_key = data.row[that.table.row_table.primkey] || [];
                that.col_primary_key = data.col[that.table.col_table.primkey] || [];
                _.each(that.properties, function(prop) {
                    that.data[prop] = data.twoD[prop] || [];
                });
                that.col_positions = that.position_columns(that.col_ordinal);
                that.intervals_being_fetched = data.intervals_being_fetched;

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
                      update_callback,
                      initial_params);
            return that
        };
    }
);

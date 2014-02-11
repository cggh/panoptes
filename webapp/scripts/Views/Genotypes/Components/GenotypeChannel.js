define(["require", "_", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model"],
    function (require, _, Framework, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model) {

        var GenotypeChannel = {};

        GenotypeChannel.Channel = function (table_info, controls_group, parent) {
            var id = table_info.id+'_genotypes';
            var that = ChannelCanvas.Base(id);

            that.init = function(table_info, controls_group, parent) {
                that._height = 40;
                that._toolTipHandler = null;
                that._clickHandler = null;
                that.parent_browser = parent;

                //Create controls
                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = that.new_col_query;
                var col_query_tool = that.col_query.createControl();
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = that.new_row_query;
                var row_query_tool = that.row_query.createControl();
                controls_group.addControl(row_query_tool);

                that.data_type = table_info.settings.ShowInGenomeBrowser.Type;
                if (that.data_type != 'diploid' && that.data_type != 'fractional')
                    DQX.reportError("Genotype data type is not diploid or fractional");
                if (that.data_type == 'diploid') {
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.first_allele_property = table_info.settings.ShowInGenomeBrowser.FirstAllele;
                    that.second_allele_property = table_info.settings.ShowInGenomeBrowser.SecondAllele;
                    that.property_list = [that.depth_property, that.first_allele_property, that.second_allele_property];
                }
                if (that.data_type == 'fractional') {
                    that.ref_fraction_property = table_info.settings.ShowInGenomeBrowser.RefFraction;
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.property_list = [that.depth_property, that.ref_fraction_property];
                }

                var properties = {};
                _.each(that.properties, function(prop) {
                    properties[prop] = ArrayBufferClient.dtype_to_array[MetaData.map2DProperties[prop].dtype.substring(1)];
                });
                //Fix order to by position for col and primary key for row
                that.model = Model(table_info,
                    that.col_query.get(),
                    that.row_query.get(),
                    table_info.col_table.PositionField,
                    table_info.row_table.primkey,
                    properties,
                    _.map(MetaData.chromosomes, DQX.attr('id'))
                );
            };
            
            //Provides a function that will be called when hovering over a position. The return string of this function will be displayed as tooltip
            that.setToolTipHandler = function(handler) {
                that._toolTipHandler = handler
            };

            //Provides a function that will be called when clicking on a position.
            that.setClickHandler = function(handler) {
                that._clickHandler = handler
            };

            that._setPlotter = function(iPlotter) {
                that._myPlotter=iPlotter;
            };

            that.draw = function (drawInfo, args) {
                var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 1);
                this.drawStandardGradientRight(drawInfo, 1);

                var psx = 10, psy = 10;
                drawInfo.centerContext.beginPath();
                drawInfo.centerContext.moveTo(psx, psy);
                drawInfo.centerContext.lineTo(psx + 4, psy + 8);
                drawInfo.centerContext.lineTo(psx - 4, psy + 8);
                drawInfo.centerContext.lineTo(psx, psy);
                drawInfo.centerContext.fill();
                drawInfo.centerContext.stroke();

                this.drawMark(drawInfo);
//                this.drawXScale(drawInfo);
                this.drawTitle(drawInfo);
            };
            
            that.init(table_info, controls_group, parent);
            return that;
        };
    return GenotypeChannel;
});

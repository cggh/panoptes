// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "_", "d3", "DQX/Model", "DQX/SQL", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
         "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Alignment/Model",
         "Views/Alignment/View"],
       function (require, _, d3, DQXModel, SQL, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model,
                 View) {

         var AlignmentChannel = {};

         AlignmentChannel.Channel = function (id, bamserve_url, bam_set,sample_id, controls_group, parent) {
           var that = ChannelCanvas.Base(id);

           that.init = function(bamserve_url, bam_set, sample_id, controls_group, parent) {
             that._height = 200;
             that._toolTipHandler = null;
             that._clickHandler = null;
             that._always_call_draw = false;
             that._title = sample_id;
             that.parent_browser = parent;
             that.sample_id = sample_id;

             that.model_params = DQXModel({
               bamserve_url: bamserve_url,
               bam_set: bam_set,
               sample_id: sample_id
             });
             that.model = Model(that._draw, that.model_params.get());

             that.view_params = DQXModel({
               height:200
             });
             that.view = View(that.view_params.get());

             that.view_params.on({}, function() {
               that.view.update_params(this.get());
               //None of these controls change the horizontal region so it is safe to just call the internal redraw.
               that._draw();
             });
             that.model_params.on({}, function() {
               that.model.update_params(this.get());
               //Call the full draw as we need to refresh data and column placement
               that.draw(that.draw_info);
             });

             //Create controls
             //NONE YET!


           };

           that.draw = function (draw_info) {
             //Save the draw info so that we can redraw when we need to without redrawing the entire panel.
             that.draw_info = draw_info;
             if (!draw_info) return;
             if (draw_info.needZoomIn) {
               return;
             }
             //This is the place where we are called by the framework when the horizontal range is changed so update the model data here.
             that.chrom = that.parent_browser.getCurrentChromoID();
             if (!that.chrom) return;
             var min_genomic_pos = draw_info.offsetX / draw_info.zoomFactX;
             var max_genomic_pos = (draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX;

             //Changing the col range will cause a redraw by calling _draw below
             that.model.change_col_range(that.chrom, min_genomic_pos, max_genomic_pos);
           };

           that._draw = function () {
             var draw_info = that.draw_info;
             if (!draw_info) return;
             if (draw_info.needZoomIn) {
               return;
             }

             //that.drawStandardGradientLeft(draw_info, 1);
            // that.drawStandardGradientRight(draw_info, 1);

             that.view.draw(draw_info.centerContext,
               draw_info.leftContext,
               {t:draw_info.top_visible, b:draw_info.bottom_visible, l:0, r:draw_info.centerContext.canvas.clientWidth},
               that.model);
           //  that.drawMark(draw_info);

           };

           that.handleMouseClicked = function (px, py, area) {
           };

           that.createVisibilityControl = function() {
             var chk=Controls.Check(null,{ label:"Display", value:(true) }).setClassID(that._myID).setOnChanged(function() {
               that.modifyVisibility(chk.getValue());
             });
             return chk;
           };

           that.modifyVisibility = function(isVisible, preventReDraw) {
             that._myPlotter.channelModifyVisibility(that.getID(), isVisible, preventReDraw);
             if (!preventReDraw)
               that._myPlotter.render();
           };

           that.init(bamserve_url, bam_set, sample_id, controls_group, parent);
           return that;
         };
         return AlignmentChannel;
       });

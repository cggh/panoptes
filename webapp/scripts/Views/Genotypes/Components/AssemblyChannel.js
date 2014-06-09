// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "_", "d3", "DQX/Model", "DQX/SQL", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
         "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model",
         "Views/Genotypes/View"],
       function (require, _, d3, DQXModel, SQL, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model,
                 View) {

         var GenotypeChannel = {};

         GenotypeChannel.Channel = function (table_info, sample_id, controls_group, parent) {
           var id = table_info.id+'_'+sample_id+'_assembly';
           var that = ChannelCanvas.Base(id);

           that.init = function(table_info, sample_id, controls_group, parent) {
             that._height = 50;
             that._toolTipHandler = null;
             that._clickHandler = null;
             that._always_call_draw = false;
             that._title = sample_id;
             that.parent_browser = parent;
             that.table_info = table_info;
             that.sample_id = sample_id;
             that.current_image = null;
             //Create controls
           };

           that.draw = function (draw_info) {
             if (!draw_info) return;
             if (draw_info.needZoomIn) {
               //comment out for now as one loses scroll pos
               //                  var height = 100;
               //                  if (that._height != height) {
               //                    that.modifyHeight(height);
               //                    that._myPlotter.resizeHeight(true);
               //                    //The last call will result in the framework calling draw, so we should end here.
               //                  }
               return;
             }
             //Save the draw info so that we can redraw when we need to without redrawing the entire panel.
             that.draw_info = draw_info;
             //This is the place where we are called by the framework when the horizontal range is changed so update the model data here.
             that.chrom = that.parent_browser.getCurrentChromoID();
             if (!that.chrom) return;
             var min_genomic_pos = draw_info.offsetX / draw_info.zoomFactX;
             var max_genomic_pos = (draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX;
             console.log('draw');
             if (!that.current_image ||
               min_genomic_pos != that.current_image.min ||
               max_genomic_pos != that.current_image.max ||
               draw_info.sizeCenterX != that.current_image.width ||
               that.chrom != that.current_image.chrom
               )
               that.update_image(min_genomic_pos, max_genomic_pos, draw_info.sizeCenterX, that.chrom);
             that._draw();
           };

           that.update_image = function(min, max, width, chrom) {
             console.log('up');
             min = Math.floor(min);
             max = Math.ceil(max);
             var new_image = new Image();
             new_image.src = "http://partner:laveran@ag1000g-dev.cggh.org/lookseq-anopheles/cgi-bin/index.pl?action=render_image&alg=bwa&from="+min+"+&to="+max+"&width="+width+"&chr="+chrom+"&sample="+that.sample_id+"&view=pileup&output=image&display=|noscale|perfect|snps|single|inversions|pairlinks|faceaway|basequal|&debug=0";
             new_image.onload = function() {
               console.log('loaded');
               that.current_image = {
                 min:min,
                 max:max,
                 width:width,
                 chrom:chrom,
                 image:new_image
               };
               that._draw();
             }
           };
           that.update_image = _.throttle(that.update_image, 1000);

           that._draw = function () {
             var draw_info = that.draw_info;
             draw_info.centerContext.clearRect ( 0 , draw_info.top_visible , draw_info.centerContext.canvas.clientWidth, draw_info.bottom_visible - draw_info.top_visible );

             var draw_info = that.draw_info;
             if (!draw_info) return;

             var image = that.current_image;
             if (!image || image.chrom != that.chrom)
               return;

             //Modify the height of the channel
             var height = image.image.height;
             if (that._height != height) {
               that.modifyHeight(height);
               that._myPlotter.resizeHeight(true);
               //The last call will result in the framework calling draw, so we should end here.
               return;
             }
             var current_min = draw_info.offsetX / draw_info.zoomFactX;
             var current_max = (draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX;

             var scale_factor = draw_info.sizeCenterX/(current_max-current_min);
             that.draw_info.centerContext.drawImage(image.image,
                                                    (image.min-current_min)*scale_factor,
                                                    0,
                                                    image.width*((image.max-image.min)/(current_max-current_min)),
                                                    image.image.height);

             //                that.drawStandardGradientLeft(draw_info, 1);
             //                that.drawStandardGradientRight(draw_info, 1);

             //DRAW
             that.drawMark(draw_info);
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

           that.init(table_info, sample_id, controls_group, parent);
           return that;
         };
         return GenotypeChannel;
       });

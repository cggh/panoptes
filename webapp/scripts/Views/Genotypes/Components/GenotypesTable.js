// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["_", "tween", "DQX/Utils"], function (_, tween, DQX) {
         return function Genotypes() {
           var that = {};
           that.last_clip = {l: 0, t: 0, r: 0, b: 0};

           that.draw = function (ctx, clip, model, view) {
             that.last_clip = clip;
             var x_scale = view.col_scale;
             var snp_width = x_scale(model.col_width) - x_scale(0);
             var row_height = Math.ceil(view.row_height);
             var pos = model.col_positions;
             var col_len = DQX.niceColours.length;

             if (model.data_type == 'diploid') {
               var firsts_rows = model.data[model.settings.FirstAllele];
               var seconds_rows = model.data[model.settings.SecondAllele];
               var alpha_rows = (view.alpha_channel == '__null') ? false : model.data[view.alpha_channel];
               var height_rows = (view.height_channel == '__null') ? false : model.data[view.height_channel];
               var alpha_offset = (view.alpha_channel == '__null') ? 0 : model.table.properties[view.alpha_channel].settings.MinVal;
               var alpha_scale = (view.alpha_channel == '__null') ? 1 : model.table.properties[view.alpha_channel].settings.MaxVal - alpha_offset;
               var height_offset = (view.height_channel == '__null') ? 0 : model.table.properties[view.height_channel].settings.MinVal;
               var height_scale = (view.height_channel == '__null') ? 1 : model.table.properties[view.height_channel].settings.MaxVal - height_offset;

               if (firsts_rows == undefined || seconds_rows == undefined || alpha_rows == undefined || height_rows == undefined)
                 return model.row_index.length * row_height;



               ctx.save();
               ctx.font = "" + row_height + "px sans-serif";
               ctx.lineWidth = 1;
               var text_width = ctx.measureText('10/10').width;
               for (var j = 0, ref = model.row_index.length; j < ref; j++) {
                 var r = model.row_index[j], y = (r * row_height);
                 //Don't draw off screen genotypes
                 if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
                   continue;
                 var firsts = firsts_rows[r], seconds = seconds_rows[r], alphas = alpha_rows[r], heights = height_rows[r];
                 for (var i = 0, end = pos.length; i < end; ++i) {
                   var alpha = alphas ? ((alphas[i] - alpha_offset) / alpha_scale) * 0.8 + 0.2 : 1;
                   alpha = Math.min(Math.max(alpha, 0), 1);
                   var height = heights ? ((heights[i] - height_offset) / height_scale) * 0.8 + 0.2 : 1;
                   height = Math.min(Math.max(height, 0), 1);
                   var first = firsts[i], second = seconds[i];
                   if (first == -1 && second == -1) {
                     height = 0.2;
                     alpha = 0.2;
                   }
                   if (first == second) {
                     if (first == 0)
                       ctx.fillStyle = 'rgba(0,55,135,' + alpha + ')'; else
                       ctx.fillStyle = 'rgba(180,0,0,' + alpha + ')';
                   } else
                     ctx.fillStyle = 'rgba(78,154,0,' + alpha + ')';
                   if (first == -1 || second == -1)
                     ctx.fillStyle = 'rgb(40,40,40)';
                   var spos = x_scale(pos[i]) - (snp_width * 0.5);
                   if (snp_width > text_width + 38 && row_height >= 6)
                     ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), Math.ceil(snp_width - text_width), height * row_height); else
                     ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), Math.ceil(snp_width), height * row_height);
                 }
               }
               //Genotype text
               if (snp_width > text_width + 38 && row_height >= 6) {
                 ctx.textBaseline = 'middle';
                 ctx.textAlign = 'center';
                 ctx.fillStyle = 'rgb(40,40,40)';
                 var style = 1;
                 for (j = 0, ref = model.row_index.length; j < ref; j++) {
                   r = model.row_index[j], y = ((r + 0.5) * row_height);
                   if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
                     continue;
                   firsts = firsts_rows[r], seconds = seconds_rows[r];
                   for (i = 0, end = pos.length; i < end; ++i) {
                     first = firsts[i], second = seconds[i];
                     var x = x_scale(pos[i]) + (snp_width / 2) - (text_width / 2);
                     if (first == -1 || second == -1) {
                       if (style != 0) ctx.fillStyle = 'rgb(150,150,150)', style = 0;
                       ctx.fillText('●', x, y);
                       continue;
                     }
                     if (first == second && first == 0) {
                       if (style != 0) ctx.fillStyle = 'rgb(150,150,150)', style = 0;
                       ctx.fillText(first + '/' + second, x, y);
                     } else {
                       if (style != 1) ctx.fillStyle = 'rgb(40,40,40)', style = 1;
                       ctx.fillText(first + '/' + second, x, y);
                     }
                   }
                 }
               }
               ctx.restore();
             }

             if (model.data_type == 'fractional') {
               var ref_rows = model.data[model.settings.Ref];
               var non_rows = model.data[model.settings.NonRef];
               var depth_offset = model.settings.DepthMin;
               var depth_scale = model.settings.DepthMax - depth_offset;

               if (ref_rows == undefined || non_rows == undefined)
                 return model.row_index.length * row_height;

               ctx.save();
               ctx.font = "" + row_height + "px sans-serif";
               ctx.lineWidth = 1;
               text_width = ctx.measureText('100/100').width;
               for (j = 0, ref = model.row_index.length; j < ref; j++) {
                 r = model.row_index[j], y = (r * row_height);
                 //Don't draw off screen genotypes
                 if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
                   continue;
                 var refs = ref_rows[r], nons = non_rows[r];
                 for (i = 0, end = pos.length; i < end; ++i) {
                   var ref_ = refs[i], non = nons[i];
                   var depth = ref_ + non;
                   height = ((depth - depth_offset) / depth_scale) * 0.8 + 0.2;
                   height = Math.min(Math.max(height, 0), 1);
                   if (ref_ + non == 0) {
                     ctx.fillStyle = 'rgb(40,40,40)';
                   } else {
                     ctx.fillStyle = 'hsl(' + (240 + ((non / (ref_ + non)) * 120)) + ',100%,35%)';
                   }
                   spos = x_scale(pos[i]) - (snp_width * 0.5);
                   if (snp_width > text_width + 38 && row_height >= 6)
                     ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), Math.ceil(snp_width - text_width), height * row_height); else
                     ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), Math.ceil(snp_width), height * row_height);
                 }
               }
               //Genotype text
               if (snp_width > text_width + 38 && row_height >= 6) {
                 ctx.textBaseline = 'middle';
                 ctx.textAlign = 'left';
                 ctx.fillStyle = 'rgb(40,40,40)';
                 for (j = 0, ref = model.row_index.length; j < ref; j++) {
                   r = model.row_index[j], y = ((r + 0.5) * row_height);
                   if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
                     continue;
                   refs = ref_rows[r], nons = non_rows[r];
                   for (i = 0, end = pos.length; i < end; ++i) {
                     ref_ = refs[i], non = nons[i];
                     var text = ref_ + ',' + non;
                     x = x_scale(pos[i]) + (snp_width / 2) - text_width+1;
                     ctx.fillText(text, x, y);
                   }
                 }
               }
               ctx.restore();
             }


               if (row_height>3) {
                   ctx.save();
                   ctx.strokeStyle = "rgba(0,0,0,0.1)";
                   ctx.lineWidth = 1;
                   ctx.beginPath();
                   for (var i=0; i<=model.row_index.length; i++) {
                       var ypos = (i) * (row_height);
                       if ((ypos + (row_height * 10) > clip.t) || (ypos - (row_height * 10) < clip.b)) {
                           ctx.moveTo(clip.l, ypos+0.5);
                           ctx.lineTo(clip.r, ypos+0.5);
                       }
                   }
                   ctx.stroke();
                   ctx.restore();
               }


             return model.row_index.length * row_height;
           };

             that.getToolTipInfo = function (px, py, model, view) {

                 var row_height = Math.ceil(view.row_height);
                 var rowNr = Math.floor(py / row_height);
                 var x_scale = view.col_scale;
                 var snp_width = x_scale(model.col_width) - x_scale(0);

                 var pos = model.col_positions;

                 var colNr = -1;
                 var colPosRight = 0;
                 for (var i = 0, end = pos.length; i < end; ++i) {
                     var spos = x_scale(pos[i]) - (snp_width * 0.5);
                     if ((px>=spos) && (px<spos+snp_width)) {
                        colNr = i;
                        colPosRight = spos+snp_width;
                     }
                 }

                 if ((colNr<0) || (rowNr<0) || (rowNr>=model.row_index.length) )
                    return null;

                 var content = 'Sample ID: ' + model.row_primary_key[rowNr];
                 content += '<br>Variant ID: ' + model.col_primary_key[colNr];

                 if (model.data_type == 'fractional') {
                     var ref_rows = model.data[model.settings.Ref];
                     var non_rows = model.data[model.settings.NonRef];
                 }

                 return {
                     ID: rowNr+'_'+colNr,
                     content: content,
                     px:colPosRight,
                     py:(rowNr+1)*row_height
                 };


             }

           that.event = function (type, pos, offset, model, view) {
             pos = {x: pos.x - offset.x, y: pos.y - offset.y};
             var clip = that.last_clip;
             if (type == 'click') {
               if (pos.x < clip.l || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
                 return false;
               var columnic_pos = view.col_scale.invert(pos.x);
               for (var i = 0, end = model.col_positions.length; i < end; ++i) {
                 var p = model.col_positions[i];
                 if (columnic_pos > (p - model.col_width / 2) && columnic_pos < (p + model.col_width / 2)) {
                   var picked_col_ord = model.col_primary_key[i];
                   break;
                 }
               }
               if (picked_col_ord) {
                 var row_height = Math.ceil(view.row_height);
                 var row_num = Math.floor(pos.y / row_height);
                 return {type: 'click_cell', col_key: picked_col_ord, row_key: model.row_primary_key[row_num]};
               }
             }
             return false;
           };
           return that;
         };
       });


// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["_", "tween", "DQX/Utils"], function (_, tween, DQX) {
         return function Genotypes() {
           var that = {};
           that.last_clip = {l: 0, t: 0, r: 0, b: 0};

           that.fractional_colourmap = [];
           for (var i=0; i < 255; i++) {
             that.fractional_colourmap[i+1] = 'hsla(' + Math.round(240 + ((i/256) * 120)) + ',100%,35%,';
           }
           that.fractional_colourmap[0] = 'hsl(0,50%,0%)';


           that.draw = function (ctx, clip, model, view) {
             that.last_clip = clip;
             var x_scale = view.col_scale;
             var snp_width = x_scale(model.col_width) - x_scale(0);
             //Restrict snp_width such that a single snp isn't full width
             snp_width = Math.min(snp_width, 150);
             var row_height = Math.ceil(view.row_height);
             var pos = model.col_positions;
             var col_len = DQX.niceColours.length;

             var call_rows = model.data[model.settings.Call] || false;
             if (call_rows.shape)
             var ploidy = call_rows.shape[2] || 1;

             var ad_rows = model.data[model.settings.AlleleDepth] || false;
             if (ad_rows.shape)
                 var ad_arity = ad_rows.shape[2] || 1;
             var call_summary_rows = model.data.call_summary || false;
             var fraction_rows = model.data.fractional_reads || false;
             var alpha_rows = (view.alpha_channel == '__null') ? false : model.data[view.alpha_channel];
             var height_rows = (view.height_channel == '__null') ? false : model.data[view.height_channel];
             var alpha_offset = (view.alpha_channel == '__null') ? 0 : model.table.properties[view.alpha_channel].settings.MinVal;
             var alpha_scale = (view.alpha_channel == '__null') ? 1 : model.table.properties[view.alpha_channel].settings.MaxVal - alpha_offset;
             var height_offset = (view.height_channel == '__null') ? 0 : model.table.properties[view.height_channel].settings.MinVal;
             var height_scale = (view.height_channel == '__null') ? 1 : model.table.properties[view.height_channel].settings.MaxVal - height_offset;

             if (!(call_summary_rows || fraction_rows) || alpha_rows == undefined || height_rows == undefined)
               return model.row_index.length * row_height;

             ctx.save();
             ctx.font = "" + row_height + "px sans-serif";
             ctx.lineWidth = 1;
             var text_width = ctx.measureText('88/88').width;
             for (var j = 0, ref = model.row_index.length; j < ref; j++) {
               var last_end = NaN;
               var r = model.row_index[j], y = (r * row_height);
               //Don't draw off screen genotypes
               if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
                 continue;
               var calls = call_rows[r], ads = ad_rows[r], call_summarys = call_summary_rows[r], fractions = fraction_rows[r], alphas = alpha_rows[r], heights = height_rows[r];
               for (var i = 0, end = pos.length; i < end; ++i) {
                 var call_summary = call_summarys ? call_summarys[i] : -1;
                 var fraction = fractions ? fractions[i] : -1;
                 var alpha = alphas ? ((alphas[i] - alpha_offset) / alpha_scale) * 0.8 + 0.2 : 1;
                 alpha = Math.min(Math.max(alpha, 0), 1);
                 var height = heights ? ((heights[i] - height_offset) / height_scale) * 0.8 + 0.2 : 1;
                 height = Math.min(Math.max(height, 0), 1);
                 if (view.colour_channel == 'call') {
                   if (call_summary == -1 || call_summary == -2) {
                     height = 0.2;
                     alpha = 0.2;
                     ctx.fillStyle = 'rgb(230,230,230)';
                   }
                   if (call_summary == 0)
                     ctx.fillStyle = 'rgba(0,55,135,' + alpha + ')';
                   if (call_summary == 1)
                     ctx.fillStyle = 'rgba(180,0,0,' + alpha + ')';
                   if (call_summary == 2)
                     ctx.fillStyle = 'rgba(78,154,0,' + alpha + ')';
                 }
                 if (view.colour_channel == 'fraction') {
                   ctx.fillStyle = fraction > 0 ? that.fractional_colourmap[fraction] + alpha + ')' : that.fractional_colourmap[fraction];
                 }
                 var spos = Math.floor(x_scale(pos[i]) - (snp_width * 0.5));
                 var spos_end = Math.ceil(spos + ((snp_width > text_width + 38 && row_height >= 6) ? snp_width - text_width : snp_width));
                 if (spos < last_end)
                   spos = last_end;
                 last_end = spos_end;
                 if (spos >= spos_end)
                   continue;
                 ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), spos_end-spos, height * row_height);
               }
               //Genotype text
               if (snp_width > text_width + 38 && row_height >= 6) {
                 var t_y = ((r + 0.5) * row_height);
                 ctx.textBaseline = 'middle';
                 ctx.textAlign = 'center';
                 ctx.fillStyle = 'rgb(40,40,40)';
                 var style = 1;
                 for (i = 0, end = pos.length; i < end; ++i) {
                   var call_summary = call_summarys ? call_summarys[i] : -1;
                   var ad = ads ? ads[i] : -1;
                   var text = '';
                   if (view.colour_channel == 'call') {
                     for (var k = i * ploidy, refk = k + ploidy; k < refk; k++) {
                       text += calls[k];
                       if (k < refk - 1)
                         text += '/';
                     }
                   } else {
                     for (var k = i * ad_arity, refk = k + ad_arity; k < refk; k++) {
                       text += ads[k];
                       if (k < refk - 1)
                         text += ',';
                     }
                   }


                   var x = x_scale(pos[i]) + (snp_width / 2) - (text_width / 2);
                   if (model.settings.Call) {
                     if (call_summary == -1 || call_summary == -2) {
                       if (style != 0) ctx.fillStyle = 'rgb(150,150,150)', style = 0;
                       ctx.fillText('●', x, t_y);
                       continue;
                     }
                     if (call_summary == 0) {
                       if (style != 0) ctx.fillStyle = 'rgb(150,150,150)', style = 0;
                       ctx.fillText(text, x, t_y);
                     } else {
                       if (style != 1) ctx.fillStyle = 'rgb(40,40,40)', style = 1;
                       ctx.fillText(text, x, t_y);
                     }
                   } else {
                     ctx.fillText(text, x, t_y);
                   }
                 }
               }
             }
             ctx.restore();
             //Lines between rows
             if (row_height>3) {
                 ctx.save();
                 ctx.strokeStyle = "rgba(0,0,0,0.1)";
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 for (i=0; i<=model.row_index.length; i++) {
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
                 var x_scale = view.col_scale;
                 var snp_width = x_scale(model.col_width) - x_scale(0);

                 var rowNr = -1;
                 for (var j = 0, ref = model.row_index.length; j < ref; j++) {
                     var r = model.row_index[j], y = (r * row_height);
                     if ( (py>=y) && (py<=y+row_height) )
                        rowNr = j;
                 }


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

                 var content = model.row_primary_key[rowNr] + ' / ' + model.col_primary_key[colNr];

                 for (var i = 0; i < model.properties.length; i++) {
                   var prop = model.properties[i];
                   var propInfo = model.table.properties[prop];
                   var prop_array = model.data[prop];
                   var arity = prop_array.shape[2] || 1;
                   content += '<br>' + propInfo.name + ':';
                   for (var j = 0; j < arity; j++) {
                     content += prop_array[rowNr][colNr * arity + j];
                     if ( j < arity-1 )
                      content += ','
                   }
                 }

                 return {
                     ID: rowNr+'_'+colNr,
                     content: content,
                     px:colPosRight,
                     py:(rowNr+1)*row_height,
                     showPointer: true
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


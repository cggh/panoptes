// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["tween", "DQX/Utils", "DQX/Msg"],
  function (tween, DQX, Msg) {
    return function ColumnHeader(height, clickSNPCallback) {
      var that = {};
      that.height = height;
      that.clickSNPCallback = clickSNPCallback;
      that.last_clip = {l: 0, t: 0, r: 0, b: 0};

      that.draw = function (ctx, clip, model, view) {
        that.last_clip = clip;
        var scale = view.col_scale;
        var snp_width = scale(model.col_width) - scale(0);
        //Restrict snp_width such that a single snp isn't full width
        snp_width = Math.min(snp_width, 150);

        //var snps = data.snp_cache.snps;
        var pos = model.col_positions;
        var col_primary_key = model.col_primary_key;
        var ord = model.col_ordinal;
        var fncIsColSelected = model.table.col_table.isItemSelected;
        var sort = _.zipObject(model.row_sort_columns, _.times(model.row_sort_columns.length, function(){return true;}));

        var alpha = tween.manual(snp_width, 5, 20);
        //Little hat and area fill
        ctx.font = "12px sans-serif";
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        var last_end = NaN;
        for (var i = 0, end = pos.length; i < end; ++i) {
          var p = pos[i];
          var key = col_primary_key[i];
          var colour = 'rgba(190,190,190, 0.75)';
          ctx.strokeStyle = 'rgba(120,120,120, 0.75)';
          if (fncIsColSelected(key)) {
              var colour = 'rgba(190,80,80, 0.75)';
              ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
          }
          ctx.fillStyle = colour;
          var labelH = 0;
          var curveH = that.height-labelH;
          var spos = Math.floor(scale(p) - (snp_width * 0.5));
          var spos_end = Math.ceil(spos + (snp_width));
          if (spos < last_end)
            spos = last_end;
          last_end = spos_end;
          var width = spos_end - spos;
          var middle = Math.round(width/2);

          if (alpha > 0) {
            ctx.save();
            ctx.translate(spos, curveH);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(0, -10, middle, -10, middle, -curveH);
            ctx.bezierCurveTo(middle, -10, width, -10, width, 0);
            ctx.closePath();
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
            if (labelH>0) {
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(width, 0);
              ctx.lineTo(width, that.height - curveH);
              ctx.lineTo(0, that.height - curveH);
              ctx.closePath();
              ctx.stroke();
            }
            if (sort[col_primary_key[i]]) {
                ctx.fillStyle = 'rgba(0,0,0, 0.75)';
                ctx.textAlign = 'center';
                if (snp_width < 60)
                    ctx.fillText('s', 0.5 * snp_width, -3);
                else
                    ctx.fillText('Sort', 0.5 * snp_width, -3);

            }
            ctx.restore();
          } else {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(Math.round(spos + (width/2)), 0);
            //ctx.bezierCurveTo(spos + (width/2), that.height, spos + (width/2), that.height, spos + (width/2), that.height);
            ctx.lineTo(Math.round(spos + (width/2)), that.height);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
        }


      };

        //Gets a column index by X position. Returns -1 if none
        that.GetColIndexByPosition = function(xPos, model, view) {
            var columnic_pos = view.col_scale.invert(xPos);
            for (var i = 0, end = model.col_positions.length; i < end; ++i) {
                var p = model.col_positions[i];
                if (columnic_pos > (p-model.col_width/2) && columnic_pos < (p+model.col_width/2))
                    return i;
            }
            return -1;
        };

        that.getToolTipInfo = function (px, py, model, view) {
            var colIndex = that.GetColIndexByPosition(px, model, view);
            if ( py < 0 || py > that.height)
                return null;
            if (colIndex>=0) {
                var key = model.col_primary_key[colIndex];
                return {
                    ID: 'column_'+key,
                    content: key,
                    px:px,
                    py:py,
                    showPointer: true
                }
            }
            else
                return null;
        }


      that.event = function (type, pos, offset, model, view, params) {
        pos = {x: pos.x - offset.x, y: pos.y - offset.y};
        var clip = that.last_clip;
        if (type == 'click') {
          if (pos.x < clip.l || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
            return false;
          var colIndex = that.GetColIndexByPosition(pos.x, model, view);
          if (colIndex>=0) {
              var key = model.col_primary_key[colIndex];
              if (params.controlPressed || params.altPressed) {
                  model.table.col_table.selectItem(key, !model.table.col_table.isItemSelected(key));
                  Msg.broadcast({type:'SelectionUpdated'}, model.table.col_table.id);
              }
              else
                return {type: 'click_col', col_key: model.col_primary_key[colIndex]};
          }

        }
        return false;
      };


      return that;
    };
  }
);

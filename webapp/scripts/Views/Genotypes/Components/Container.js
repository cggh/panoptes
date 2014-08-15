// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
  function () {
    return function Container(contents) {
      var that = {};
      that.contents = contents;
      that.contents.forEach(function (element) {
        element.t || (element.t = 0);
        element.l || (element.l = 0);
      });
      that.contents_by_name = DQX.attrMap(that.contents, 'name');

      that.draw = function (ctx, clip, model, view) {
        that.contents.forEach(function (element) {
          ctx.save();
          ctx.translate(element.l, element.t);
          element.content.draw(ctx, {
            t: clip.t - element.t,
            l: clip.l - element.l,
            b: clip.b - element.t,
            r: clip.r - element.l
          }, model, view);
          ctx.restore();
        })
      };


        that.getToolTipInfo = function (px, py, model, view) {
            var tooltip = null;
            that.contents.forEach(function (element) {
                if (element.content.getToolTipInfo) {
                    var rs = element.content.getToolTipInfo(px - element.l, py - element.t, model, view);
                    if (rs) {
                        tooltip = rs;
                        tooltip.px += element.l;
                        tooltip.py += element.t;
                    }
                }
            })
            return tooltip;
        }


      that.event = function (type, ev, offset, model, view, params) {
        var done = false;
        //Go in reverse to get top elements first
        for (var i = contents.length - 1; i >= 0; --i) {
          done = that.contents[i].content.event(
            type,
            ev,
            {x: that.contents[i].l + offset.x, y: that.contents[i].t + offset.y},
            model,
            view,
            params);
          if (done)
            return done;
        }
        return done;
      };

      return that;
    };
  }
);

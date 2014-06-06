// This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["tween", "DQX/Utils"],
    function (tween, DQX) {
        return function Link(height) {
            var that = {};
            that.height = height;
            that.last_clip = {l: 0, t: 0, r: 0, b: 0};

            that.draw = function (ctx, clip, model, view) {
                that.last_clip = clip;
                var scale = view.col_scale;
                var pos = model.col_positions;
                var ord = model.col_ordinal;

                ctx.strokeStyle = 'rgb(130,130,130)';//TODODQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
                ctx.lineWidth = 1;//snp && snp.selected ? 2 : 1;
                var mid = that.height * 0.5;
                for (var i = 0, end = pos.length; i < end; ++i) {
                    var p = scale(pos[i]);
                    var o = scale(ord[i]);
                    ctx.beginPath();
                    ctx.moveTo(o,0);
                    ctx.bezierCurveTo(o, mid, p , mid, p, that.height);
                    ctx.stroke();
                }
            };
            that.event = function (type, ev, offset) {
            };
            return that;
        };
    }
);

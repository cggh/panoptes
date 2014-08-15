// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
    function () {
        return function Gradient(colour, colour2, fraction_fade, height, width) {
            var that = {};
            that.colour = colour;
            that.colour2 = colour2;
            //that.fade_edge = fade_edge;
            that.fraction_fade = fraction_fade;
            that.height = height;
            that.width = width;

            that.draw = function (ctx, clip) {
                var width = that.width || clip.r-clip.l;
                var height = that.height || clip.b-clip.t;
                var g = ctx.createLinearGradient(0, 0, 0, height);
                g.addColorStop(0, that.colour);
                g.addColorStop(fraction_fade, that.colour);
                g.addColorStop(1, that.colour2);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, width, height);

            };
            that.event = function (type, ev, offset) {
            };
            return that;
        };
    }
);
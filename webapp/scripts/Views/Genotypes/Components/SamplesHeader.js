// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
    function () {
        return function SamplesHeader() {
            var that = {};

            that.draw = function (ctx, clip, model, view) {

                ctx.fillStyle = 'rgb(40,40,40)';
                ctx.font = "" + (view.row_height) + "px sans-serif";

                var row_labels = model.row_ordinal;
                _.forEach(row_labels, function(label, i) {
                    ctx.fillText(label, 0, (i+1) * (view.row_height));
                });
            };

            that.event = function (type, ev, offset) {
            };

            return that;
        };
    }
);
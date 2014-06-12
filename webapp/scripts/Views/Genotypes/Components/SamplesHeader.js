// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
    function () {
        return function SamplesHeader() {
            var that = {};

            that.draw = function (ctx, clip, model, view) {

                var samplesTableInfo = model.table.row_table;

                var dispPropId = view.samples_property;

                var row_keys = model.row_ordinal;

                if (samplesTableInfo.primkey == dispPropId) {
                    var labelMapper = function(key) { return key; };
                }
                else {
                    if (!samplesTableInfo.fieldCache.requestAll(dispPropId, function() {
                        model.update_callback();
                    })) {
                        //todo: draw waiting message
                        return;
                    }
                    var labelMapper = function(key) {
                        return samplesTableInfo.fieldCache.getField(key, dispPropId);
                    };
                }

                ctx.fillStyle = 'rgb(0,0,0)';
                ctx.font = "" + (view.row_height) + "px sans-serif";

                _.forEach(row_keys, function(key, i) {
                    ctx.fillText(labelMapper(key), 0, (i+1) * (view.row_height));
                });
            };

            that.event = function (type, ev, offset) {
            };

            return that;
        };
    }
);
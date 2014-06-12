// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "MetaData"
],
    function (
        MetaData
        ) {
        return function SamplesHeader() {
            var that = {};

            that.draw = function (ctx, clip, model, view) {

                var samplesTableInfo = model.table.row_table;

                var dispPropId = view.samples_property;
                var dispPropInfo = MetaData.findProperty(samplesTableInfo.id, dispPropId);

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
                        return dispPropInfo.toDisplayString(samplesTableInfo.fieldCache.getField(key, dispPropId));
                    };
                }

                var row_height = view.row_height;
                ctx.fillStyle = 'rgb(0,0,0)';
                ctx.font = "" + (row_height) + "px sans-serif";

                _.forEach(row_keys, function(key, i) {
                    var ypos = (i+1) * (row_height);
                    if ((ypos + (row_height * 10) > clip.t) || (ypos - (row_height * 10) < clip.b)) {
                        var label = labelMapper(key);
                        ctx.fillText(label, 0, ypos);
                    }
                });
            };

            that.event = function (type, ev, offset) {
            };

            return that;
        };
    }
);
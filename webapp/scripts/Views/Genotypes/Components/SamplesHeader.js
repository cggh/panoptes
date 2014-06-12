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

//            that.sortByField = function() {
//                debugger;
//            };

            that.draw = function (ctx, clip, model, view) {

                var width = ctx.canvas.clientWidth;
                var height = ctx.canvas.clientHeight;

                var samplesTableInfo = model.table.row_table;

                var dispPropId = view.samples_property;
                var dispPropInfo = MetaData.findProperty(samplesTableInfo.id, dispPropId);

                var row_keys = model.row_primary_key;

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
                var fontSize = Math.min(12, row_height-1);
                ctx.font = "" + (fontSize) + "px sans-serif";
                ctx.fillStyle = 'rgb(0,0,0)';

                var showIndividualLines = row_height>10;

                ctx.strokeStyle = "rgba(0,0,0,0.1)";
                ctx.lineWidth = 1;
                if (showIndividualLines) {
                    ctx.beginPath();
                    for (var i=0; i<=row_keys.length; i++) {
                        var ypos = (i) * (row_height);
                        if ((ypos + (row_height * 10) > clip.t) || (ypos - (row_height * 10) < clip.b)) {
                            ctx.moveTo(0, ypos+0.5);
                            ctx.lineTo(width, ypos+0.5);
                        }
                    }
                    ctx.stroke();
                }


                var drawGroupLabel = function(labelName, startIndex, endIndex) {
                    if (endIndex<startIndex)
                        return;
                    var yposTop = startIndex * row_height;
                    var yposBottom = (endIndex+1) * row_height;
                    if (yposBottom>yposTop+3) {
                        ctx.beginPath();
                        ctx.moveTo(0, yposBottom+0.5);
                        ctx.lineTo(width, yposBottom+0.5);
                        ctx.stroke();
                        if (yposBottom>yposTop+5) {
                            var fontSize = Math.min(12, yposBottom-yposTop-1);
                            ctx.font = "" + (fontSize) + "px sans-serif";
                            var textYPos = (yposBottom+yposTop)/2 -1 + fontSize/2;
                            if ((textYPos<clip.t+fontSize) && (yposBottom>clip.t+fontSize) )
                                textYPos = clip.t+fontSize;
                            if ((textYPos>clip.b-2) && (yposTop<clip.b-fontSize) )
                                textYPos = clip.b-2;
                            ctx.fillText(labelName, 2, textYPos);
                        }
                    }
                };

                var groupLabel = null;
                var groupStartIndex  = 0;
                _.forEach(row_keys, function(key, i) {
                    var ypos = (i+1) * (row_height);
                    if ((ypos + (row_height * 10) > clip.t) || (ypos - (row_height * 10) < clip.b)) {
                        var label = labelMapper(key);
                        if (showIndividualLines) {
                            ctx.fillText(label, 2, ypos - 1 - (row_height-fontSize)/2);
                        }
                        else {
                            if (label!=groupLabel) {
                                drawGroupLabel(groupLabel, groupStartIndex, i-1)
                                groupLabel =label;
                                groupStartIndex = i;
                            }
                        }
                    }
                });
                if (groupLabel!=null)
                    drawGroupLabel(groupLabel, groupStartIndex, row_keys.length-1)
            };

            that.event = function (type, ev, offset) {
            };

            return that;
        };
    }
);
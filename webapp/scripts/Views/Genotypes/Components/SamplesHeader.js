// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "DQX/Msg",
    "MetaData"
],
    function (
        Msg,
        MetaData
        ) {
        return function SamplesHeader() {
            var that = {};

            that.draw = function (ctx, clip, model, view) {

                var width = ctx.canvas.clientWidth;
                var height = ctx.canvas.clientHeight;

                var samplesTableInfo = model.table.row_table;
                var fncIsRowSelected = samplesTableInfo.isItemSelected;

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

                that.showIndividualLines = row_height>10;

                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                ctx.lineWidth = 1;
                if (that.showIndividualLines) {
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

                var bottomLineDrawn =false;
                var drawGroupLabel = function(labelName, startIndex, endIndex) {
                    if (endIndex<startIndex)
                        return;
                    var yposTop = startIndex * row_height;
                    var yposBottom = (endIndex+1) * row_height;
                    if (yposBottom>yposTop+3) {
                        ctx.beginPath();
                        if (!bottomLineDrawn) {
                            ctx.moveTo(0, yposTop+0.5);
                            ctx.lineTo(width, yposTop+0.5);
                        }
                        ctx.moveTo(0, yposBottom+0.5);
                        ctx.lineTo(width, yposBottom+0.5);
                        ctx.stroke();
                        bottomLineDrawn = true;
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
                    else
                        bottomLineDrawn = false;
                };

                var groupLabel = null;
                var groupStartIndex  = 0;
                _.forEach(row_keys, function(key, i) {
                    var ypos = (i+1) * (row_height);
                    if ((ypos + (row_height * 10) > clip.t) || (ypos - (row_height * 10) < clip.b)) {
                        var label = labelMapper(key);
                        if (that.showIndividualLines) {
                            if (fncIsRowSelected(key))
                                ctx.fillStyle = 'rgb(255,80,80)';
                            else
                                ctx.fillStyle = 'rgb(255,255,255)';
                            ctx.beginPath();
                            ctx.rect(1.5,ypos-row_height+2.5, 10,row_height-4);
                            ctx.fill();
                            ctx.stroke();
                            ctx.fillStyle = 'rgb(0,0,0)';
                            ctx.fillText(label, 13, ypos - 1 - (row_height-fontSize)/2);
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

            that.getToolTipInfo = function (px, py, model, view) {
                var row_keys = model.row_primary_key;
                var row_height = view.row_height;
                var rowNr = -1;
                var rowYPos = 0;
                _.forEach(row_keys, function(key, i) {
                    var ypos = i * (row_height);
                    if ((py>=ypos) && (py<=ypos+row_height)) {
                        rowNr = i;
                        rowYPos = (i+1)*row_height;
                    }
                });
                if (rowNr<0)
                    return;
                var key = row_keys[rowNr];
                var content = key;
                var samplesTableInfo = model.table.row_table;
                var dispPropId = view.samples_property;
                var dispPropInfo = MetaData.findProperty(samplesTableInfo.id, dispPropId);
                if (samplesTableInfo.primkey != dispPropId) {
                    content += '<br>' + dispPropInfo.toDisplayString(samplesTableInfo.fieldCache.getField(key, dispPropId));
                }
                return {
                    ID: 'sample_'+key,
                    key: key,
                    content: content,
                    px: px,
                    py: rowYPos,
                    showPointer: true
                };
            };

            that.event = function (type, pos, offset, model, view) {
                var samplesTableInfo = model.table.row_table;
                if (type=='click') {
                    var info = that.getToolTipInfo(pos.x - offset.x, pos.y - offset.y, model, view);
                    if (info) {
                        if (that.showIndividualLines && (pos.x<12) ) {
                            model.table.row_table.selectItem(info.key, !model.table.row_table.isItemSelected(info.key));
                            Msg.broadcast({type:'SelectionUpdated'}, model.table.row_table.id);
                        }
                        else {
                            Msg.send({ type: 'ItemPopup' }, { tableid:samplesTableInfo.id, itemid:info.key } );
                        }
                    }
                }

            }

            return that;
        };
    }
);
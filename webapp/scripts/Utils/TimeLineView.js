// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/ChannelPlot/ChannelPlotter", "DQX/ChannelPlot/ChannelCanvas",
    "Utils/MiscUtils"
],
    function (
        require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, ChannelPlotter, ChannelCanvas,
        MiscUtils
        ) {

        var TimeLineView = {};



        TimeLineView.ChannelScale = function (itimeLine) {
            var that = ChannelCanvas.Base('_TimeScale');
            that._height = 31;
            that.myTimeLine = itimeLine;

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 0.84);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);
                if (!that.myTimeLine.hasDataPoints)
                    return;
                if ((!that.myTimeLine.minJD) && (!that.myTimeLine.maxJD))
                    return;

                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';


                var textScaleInfo = MiscUtils.createDateScaleInfo(80, drawInfo.zoomFactX);
                var tickScaleInfo = MiscUtils.createDateScaleInfo(20, drawInfo.zoomFactX);

                var pad = function(n) {return n<10 ? '0'+n : n};

                var JD1IntMin = Math.floor(that.myTimeLine.minJD);
                var JD1IntMax = Math.ceil(that.myTimeLine.maxJD);
                for (var JDInt = JD1IntMin; JDInt<= JD1IntMax; JDInt++) {
                    var psx = Math.round((JDInt-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    var dt = DQX.JD2DateTime(JDInt);
                    var year = dt.getUTCFullYear();
                    var month = dt.getUTCMonth() + 1;
                    var day = dt.getUTCDate();
                    if (textScaleInfo.isOnScale(year, month, day)) {
                        var st1 = year;
                        drawInfo.centerContext.fillText(st1, psx, 6);
                        if (!textScaleInfo.yearInterval) {
                            var st2 = '-'+pad(month)+'-'+pad(day);
                            drawInfo.centerContext.fillText(st2, psx, 16);
                            drawInfo.centerContext.beginPath();
                            drawInfo.centerContext.moveTo(psx, 0);
                            drawInfo.centerContext.lineTo(psx, 7);
                            drawInfo.centerContext.stroke();
                        }
                    } else if (tickScaleInfo.isOnScale(year, month, day)) {
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(psx, 0);
                        drawInfo.centerContext.lineTo(psx, 3);
                        drawInfo.centerContext.stroke();
                    }
                }

                this.drawMark(drawInfo, true);
            }

            return that;
        }



        TimeLineView.ChannelData = function (itimeLine) {
            var that = ChannelCanvas.Base('_TimeData');
            that.myTimeLine = itimeLine;
            that._height = 25;
            that.setAutoFillHeight(true);
            that.rateScale = 1.0e-99;


            that.reset = function() {
                that.rateScale = 1.0e-99;
            };

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);
                if (!that.myTimeLine.hasDataPoints)
                    return;


                var pointSet = that.myTimeLine.myPointSet;
                if (pointSet.length == 0)
                    return;

                var plotSettings = that.myTimeLine.mySettings;
                var hasCategoricalData = plotSettings.catData;

                var colorStrings0 = [];
                if (hasCategoricalData) {
                    $.each(that.myTimeLine.colorMap, function(idx, color) {
                        colorStrings0.push(color.lighten(0.3).toStringCanvas());
                    });
                }
                else
                    colorStrings0.push(DQX.Color(0.7,0.7,0.7).toStringCanvas());

                var blockSize = Math.max(1,Math.round(7/drawInfo.zoomFactX));
                var JD1IntMin = Math.floor(that.myTimeLine.minJD);
                var JD1IntMax = Math.ceil(that.myTimeLine.maxJD);

                var JDLeft = (-100 + drawInfo.offsetX) / drawInfo.zoomFactX + that.myTimeLine.minJD;
                var JDRight = (drawInfo.sizeCenterX+100 + drawInfo.offsetX) / drawInfo.zoomFactX + that.myTimeLine.minJD;
                var blockNrMin = Math.round(JDLeft/blockSize);
                var blockCount = Math.round(JDRight/blockSize) - blockNrMin
                var blocks = [];
                for (var blockNr = 0; blockNr<blockCount; blockNr++) {
                    var block = {
                        memberCount: 0,
                        selectedMemberCount: 0,
                        memberCategoriesCount: []
                    };
                    blocks.push(block);
                }

                for (var ptnr=0; ptnr<pointSet.length; ptnr++) {
                    var point = pointSet[ptnr];
                    if ( (point.dateJD>=JDLeft) && (point.dateJD<=JDRight) ) {
                        var blockNr = Math.round(point.dateJD/blockSize) - blockNrMin;
                        if ( (blockNr>=0) && (blockNr<blockCount) ) {
                            var block = blocks[blockNr];
                            block.memberCount += 1;
                            if (point.sel)
                                block.selectedMemberCount += 1;
                            while (block.memberCategoriesCount.length<=point.catNr)
                                block.memberCategoriesCount.push(0);
                            block.memberCategoriesCount[point.catNr] += 1;
                        }
                    }
                }
                $.each(blocks, function(idx, block) {
                    ;
                    that.rateScale = Math.max(that.rateScale, block.memberCount*1.0/blockSize);
                });



                var yOffset = drawInfo.sizeY;
                var ySize = drawInfo.sizeY*0.9;
                var selBarWidth = Math.max(2,0.33*blockSize*drawInfo.zoomFactX);

                drawInfo.centerContext.strokeStyle = 'rgb(0,0,0)';
                drawInfo.centerContext.lineWidth = 0.25;
                $.each(blocks, function(blockNr, block) {
                    var JDCent = (blockNr+blockNrMin)*blockSize;
                    var psx1 = /*Math.round(*/(JDCent-blockSize/2.0-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX/*) + 0.5*/;
                    var psx2 = /*Math.round(*/(JDCent+blockSize/2.0-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX/*) + 0.5*/;

                    var barScale = blockSize*that.rateScale;
                    if (that.myTimeLine.drawStyle.showTimeBarsAsPercentage)
                        barScale = Math.max(1,block.memberCount);

                    var incrCount = 0;
                    $.each(block.memberCategoriesCount, function(catNr, catCount) {
                        var psh1 = Math.round(incrCount*1.0/barScale*ySize);
                        var psh2 = Math.round((incrCount+catCount)*1.0/barScale*ySize);
                        drawInfo.centerContext.fillStyle = colorStrings0[catNr];
                        drawInfo.centerContext.fillRect(psx1,yOffset-psh2,psx2-psx1,psh2-psh1);
                        incrCount += catCount;
                    });
                    var psh = Math.round(block.memberCount*1.0/barScale*ySize);
                    drawInfo.centerContext.strokeStyle = 'rgb(0,0,0)';
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.rect(psx1,yOffset-psh,psx2-psx1,psh);
                    drawInfo.centerContext.stroke();
                    if (block.selectedMemberCount>0) {
                        var psh = Math.round(block.selectedMemberCount*1.0/barScale*ySize);
                        drawInfo.centerContext.fillStyle = 'rgb(64,0,0)';
                        drawInfo.centerContext.fillRect(psx1,yOffset-psh,selBarWidth,psh);
                    }
                });


                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                this.drawMark(drawInfo, false);

                that.drawVertScale(drawInfo, 0, that.rateScale, { offsetFrac:0.0, rangeFrac:0.9 });

                drawInfo.leftContext.font = '11px sans-serif';
                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.fillText('1/d', 20, Math.round(drawInfo.sizeY*0.5)+7);


            }

            return that;
        }


        TimeLineView.Create = function(iParentRef) {
            var that = ChannelPlotter.Panel(iParentRef, { hasHeader: false, hasFooter: false, hasXScale: false, leftWidth:80});
            that.scaleConversionFactor = 1.0;
            that.myPointSet = [];
            that.colorMap = DQX.standardColors;

            that.drawStyle = {
                showTimeBarsAsPercentage: false
            };

            that.storeSettings = function() {
                var obj = {};
                obj.range = that.getVisibleRange();
                var markInfo = that.getMark();
                if (markInfo)
                    obj.mark = markInfo;

                obj.minJD = that.minJD;
                obj.maxJD = that.maxJD;

                return obj;
            };

            that.recallSettings = function(settObj) {
                that.setRangeJD(settObj.minJD, settObj.maxJD);
                that.setPosition((settObj.range.max+settObj.range.min)/2, settObj.range.max-settObj.range.min);
                if (settObj.mark)
                    that.setMark(settObj.mark.min, settObj.mark.max);

            };


            that.channelData = TimeLineView.ChannelData(that);
            that.addChannel(that.channelData, true);
            that.addChannel(TimeLineView.ChannelScale(that), true);

            Msg.listen('',{ type: 'PosOrZoomFactorXChanged', id: that.myID }, function() {
                if (that._onViewPortModified)
                    that._onViewPortModified();
            });

            that.setOnRangeSelected(function() {
                var range = that.getMark();
                that.delMark();
                if (that._onTimeRangeSelected)
                    that._onTimeRangeSelected(range.min+that.minJD,range.max+that.minJD);
            });


            that.handleResize();


            that.setOnViewPortModified = function(handler) {
                that._onViewPortModified = handler;
            }

            that.setOnTimeRangeSelected = function(handler) {
                that._onTimeRangeSelected = handler;
            }

            that.getVisibleTimeRange = function() {
                var range = that.getVisibleRange();
                range.min += that.minJD;
                range.max += that.minJD;
                return range;
            }

            that.setRangeJD = function(minJD, maxJD) {
                that.minJD = minJD;
                that.maxJD = maxJD;
                that.rangeJD = that.maxJD - that.minJD;
                that.setRange(0,that.rangeJD, that.rangeJD/4);
            }

            that.setColorMap = function(mp) {
                that.colorMap = mp;
            };


            that.setPoints = function(ipointset, iSettings) {
                that.myPointSet = ipointset;
                that.mySettings = iSettings;

                var minJD = 1.0E99;
                var maxJD = -1.0E99;
                that.hasDataPoints = false;
                $.each(that.myPointSet, function(idx, pt) {
                    if (pt.dateJD!=null) {
                        minJD = Math.min(minJD, pt.dateJD-0.5);
                        maxJD = Math.max(maxJD, pt.dateJD+0.5);
                        that.hasDataPoints = true;
                    }
                })
                if (that.hasDataPoints) {
                    if ( (!that.minJD) || (!that.maxJD) || (Math.abs(that.minJD-minJD)>0.001) || (Math.abs(that.maxJD-maxJD)>0.001) )
                        that.setRangeJD(minJD, maxJD);
                }
                else {
                    that.setRangeJD(2456873.5, 2456873.5+100);
                }
            };

            that.clearPoints = function() {
                this.myPointSet = [];
                that.channelData.reset();
            };

            that.setDrawStyle = function(drawStyle) {
                that.drawStyle = drawStyle;
            }


            that.draw = function() {
                if (that.hasDataPoints)
                    that.render();
            }

            that.updateSelection = function() {
                that.render();
            };

            return that;
        }



        return TimeLineView;
    });



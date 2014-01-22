define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/ChannelPlot/ChannelPlotter", "DQX/ChannelPlot/ChannelCanvas"
],
    function (
        require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, ChannelPlotter, ChannelCanvas
        ) {

        var TimeLineView = {};



        TimeLineView.ChannelScale = function (itimeLine) {
            var that = ChannelCanvas.Base('_TimeScale');
            that._height = 28;
            that.myTimeLine = itimeLine;

            that.draw = function (drawInfo) {
                if ((!that.myTimeLine.minJD) && (!that.myTimeLine.maxJD))
                    return;
                this.drawStandardGradientCenter(drawInfo, 0.84);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);

                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';

                var createDateScaleInfo = function(optimDist) {
                    var dist,shear;
                    var minShear = 1.0e9;
                    var calcShear = function(dst) {
                        return Math.abs(dst/optimDist-1.0);
                    }
                    var rs = {
                        namedDays: null,
                        monthInterval: null,
                        yearInterval: null
                    };

                    // try each day
                    dist = 1*drawInfo.zoomFactX;
                    shear = calcShear(dist);
                    if (shear<minShear) {
                        minShear = shear;
                        rs.namedDays = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,39,31];
                    }

                    // try each 2 days
                    dist = 2*drawInfo.zoomFactX;
                    shear = calcShear(dist);
                    if (shear<minShear) {
                        minShear = shear;
                        rs.namedDays = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30];
                    }

                    // try each 5 days
                    dist = 5*drawInfo.zoomFactX;
                    shear = calcShear(dist);
                    if (shear<minShear) {
                        minShear = shear;
                        rs.namedDays = [1,5,10,15,20,25];
                    }

                    // try each 10 days
                    dist = 10*drawInfo.zoomFactX;
                    shear = calcShear(dist);
                    if (shear<minShear) {
                        minShear = shear;
                        rs.namedDays = [1,10,20];
                    }

                    // try each 15 days
                    dist = 15*drawInfo.zoomFactX;
                    shear = calcShear(dist);
                    if (shear<minShear) {
                        minShear = shear;
                        rs.namedDays = [1,15];
                    }

                    // try month multiples
                    $.each([1,2,3,6,12], function(idx, mult) {
                        dist = mult*30*drawInfo.zoomFactX;
                        shear = calcShear(dist)
                        if (shear<minShear) {
                            minShear = shear;
                            rs.monthInterval = mult;
                            rs.namedDays = null;
                            rs.yearInterval = null;
                        }
                    })

                    // try year multiples
                    $.each([1,2,5,10], function(idx, mult) {
                        dist = mult*365*drawInfo.zoomFactX;
                        shear = calcShear(dist)
                        if (shear<minShear) {
                            minShear = shear;
                            rs.monthInterval = null;
                            rs.namedDays = null;
                            rs.yearInterval = mult;
                        }
                    });

                    rs.isOnScale = function(year, month, day) {
                        if (this.yearInterval) {
                            if ( (year%this.yearInterval == 0) && (month==1) &&(day==1) )
                                return true;
                            return false;
                        }
                        if (this.monthInterval) {
                            if ( ((month-1)%this.monthInterval == 0) && (day==1) )
                                return true;
                            return false;
                        }
                        if (this.namedDays.indexOf(day)>=0)
                            return true;
                        return false;
                    }

                    return rs;
                }

                var textScaleInfo = createDateScaleInfo(80);
                var tickScaleInfo = createDateScaleInfo(20);

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
                        drawInfo.centerContext.fillText(st1, psx, 1);
                        if (!textScaleInfo.yearInterval) {
                            var st2 = pad(month)+'-'+pad(day);
                            drawInfo.centerContext.fillText(st2, psx, 11);
                            drawInfo.centerContext.beginPath();
                            drawInfo.centerContext.moveTo(psx, drawInfo.sizeY-7);
                            drawInfo.centerContext.lineTo(psx, drawInfo.sizeY);
                            drawInfo.centerContext.stroke();
                        }
                    } else if (tickScaleInfo.isOnScale(year, month, day)) {
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(psx, drawInfo.sizeY-3);
                        drawInfo.centerContext.lineTo(psx, drawInfo.sizeY);
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


            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);

                var colorStrings0 = [];
                $.each(DQX.standardColors, function(idx, color) {
                    colorStrings0.push(color.toStringCanvas());
                });

                var pointSet = that.myTimeLine.myPointSet;
                if (pointSet.length == 0)
                    return;

                var hasCategoricalData = that.myTimeLine.mySettings.catData;

                var blockSize = Math.max(1,Math.round(5/drawInfo.zoomFactX));
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

                var yOffset = drawInfo.sizeY-10;
                var ySize = drawInfo.sizeY-20;

                drawInfo.centerContext.strokeStyle = 'rgb(0,0,0)';
                drawInfo.centerContext.lineWidth = 0.25;
                $.each(blocks, function(blockNr, block) {
                    var JDCent = (blockNr+blockNrMin)*blockSize;
                    var psx1 = Math.round((JDCent-blockSize/2.0-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    var psx2 = Math.round((JDCent+blockSize/2.0-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;

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
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.rect(psx1,yOffset-psh,psx2-psx1,psh);
                    drawInfo.centerContext.stroke();
                });


                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                this.drawMark(drawInfo, true);
            }

            return that;
        }


        TimeLineView.Create = function(iParentRef) {
            var that = ChannelPlotter.Panel(iParentRef, { hasHeader: false, hasFooter: false, hasXScale: false});
            that.scaleConversionFactor = 1.0;
            that.myPointSet = [];

            that.drawStyle = {
                showTimeBarsAsPercentage: false
            };



            that.addChannel(TimeLineView.ChannelScale(that), true);
            that.addChannel(TimeLineView.ChannelData(that), true);

            Msg.listen('',{ type: 'PosOrZoomFactorXChanged', id: that.myID }, function() {
                if (that._onViewPortModified)
                    that._onViewPortModified();
            });


            that.handleResize();


            that.setOnViewPortModified = function(handler) {
                that._onViewPortModified = handler;
            }

            that.getVisibleTimeRange = function() {
                var range = that.getVisibleRange();
                range.min += that.minJD;
                range.max += that.minJD;
                return range;
            }


            that.setPoints = function(ipointset, iSettings) {
                that.myPointSet = ipointset;
                that.mySettings = iSettings;

                var minJD = 1.0E99;
                var maxJD = -1.0E99;
                $.each(that.myPointSet, function(idx, pt) {
                    minJD = Math.min(minJD, pt.dateJD-0.5);
                    maxJD = Math.max(maxJD, pt.dateJD+0.5);
                })
                if ( (!that.minJD) || (!that.maxJD) || (Math.abs(that.minJD-minJD)>0.001) || (Math.abs(that.maxJD-maxJD)>0.001) ) {
                    that.minJD = minJD;
                    that.maxJD = maxJD;
                    that.rangeJD = that.maxJD - that.minJD;
                    that.setRange(0,that.rangeJD, that.rangeJD/4);
                }
            };

            that.clearPoints = function() {
                this.myPointSet = [];
            };

            that.setDrawStyle = function(drawStyle) {
                that.drawStyle = drawStyle;
            }


            that.draw = function() {
                that.render();
            }

            return that;
        }



        return TimeLineView;
    });



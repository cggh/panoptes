// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/QueryTable", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery",
    "MetaData"
],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, QueryTable, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery,
              MetaData
        ) {

        var MiscUtils = {};

        //A helper function, turning a fraction into a color string
        var createFuncFraction2Color = function(minval, maxval) {
            var range = maxval-minval;
            if (!range)
                range = 1;
            return function (vl) {
                if (vl == null)
                    return "white";
                else {
                    vl=parseFloat(vl);
                    vl = (vl-minval) / range;
                    vl = Math.max(0, vl);
                    vl = Math.min(1, vl);
                    if (vl > 0) vl = 0.05 + vl * 0.95;
                    vl = Math.sqrt(vl);
                    var b = 255 ;
                    var g = 255 * (1 - 0.15*vl * vl);
                    var r = 255 * (1 - 0.3*vl);
                    return "rgb(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ")";
                }
            };
        }


        MiscUtils.createEncoderId = function(tableid, propid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var propInfo = MetaData.findProperty(tableid, propid);
            var encoding  = 'String';
            if (propInfo.datatype=='Value') {
                encoding  = 'Float3';
                if ((propInfo.settings.decimDigits ==0 ) || (propInfo.isPrimKey))
                    encoding  = 'Int';
            }
            if (propInfo.datatype=='HighPrecisionValue') {
                encoding  = 'FloatH';
            }
            if ((propInfo.datatype=='Value') && (propInfo.propid==tableInfo.PositionField) && (tableInfo.hasGenomePositions) )
                encoding  = 'Int';
            if (propInfo.datatype=='Boolean')
                encoding  = 'Int';
            if ( (propInfo.datatype=='GeoLongitude') || (propInfo.datatype=='GeoLattitude') )
                encoding  = 'Float4';
            if ( (propInfo.datatype=='Date') )
                encoding  = 'Float4';
            return encoding;
        }

        MiscUtils.createItemTableViewerColumn = function(theTable, tableid, propid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var propInfo = MetaData.findProperty(tableid, propid);
            var encoding  = MiscUtils.createEncoderId(tableid, propid);
            var tablePart = 1;
            if (propInfo.isPrimKey)
                tablePart = 0;
            var sortable = true;
            if (tableInfo.hasGenomePositions)
                if ( (propInfo.propid==tableInfo.ChromosomeField) || (propInfo.propid===tableInfo.PositionField) )
                    sortable = false;
            if (tableInfo.hasGenomeRegions)
                if ( (propInfo.propid==tableInfo.settings.Chromosome) || (propInfo.propid===tableInfo.settings.RegionStart) || (propInfo.propid===tableInfo.settings.RegionStop) )
                    sortable = false;
            var sortByDefault = false;
            if (sortable)
                sortByDefault = propid == tableInfo.settings.SortDefault;
            var col = theTable.createTableColumn(
                QueryTable.Column(propInfo.name,propInfo.propid,tablePart),
                encoding,
                sortable,
                sortByDefault
            );
            if (propInfo.settings.Description)
                col.setToolTip(propInfo.settings.Description);
            if ( (tableInfo.hasGenomePositions) && (theTable.findColumn(tableInfo.ChromosomeField)) && (theTable.findColumn(tableInfo.PositionField) && (propid==tableInfo.PositionField) ) ) {
                // Define a joint sort action on both columns chromosome+position, and set it as default if no other
//                var sortByDefault = false;
                if (!tableInfo.settings.SortDefault)
                    var sortByDefault = true;
                theTable.addSortOption("Position", SQL.TableSort([tableInfo.ChromosomeField, tableInfo.PositionField]),sortByDefault);
            }

            if (tableInfo.hasGenomeRegions && (propInfo.propid===tableInfo.settings.RegionStart)) {
                sortByDefault = propid == tableInfo.settings.SortDefault;
                theTable.addSortOption("Position", SQL.TableSort([tableInfo.settings.Chromosome, tableInfo.settings.RegionStart]),sortByDefault);
            }

            if (propInfo.datatype=='Boolean')
                col.setDataType_MultipleChoiceInt([{id:0, name:'No'}, {id:1, name:'Yes'}]);

            if (propInfo.propid==tableInfo.ChromosomeField)
                col.setDataType_MultipleChoiceString(MetaData.chromosomes);

            if (propInfo.propCategories) {
                var cats = [];
                $.each(propInfo.propCategories, function(idx, cat) {
                    cats.push({id:cat, name:cat});
                });
                col.setDataType_MultipleChoiceString(cats);
            }


            if (propInfo.isPrimKey) {
                col.setCellClickHandler(function(fetcher,downloadrownr) {
                    var itemid = theTable.getCellValue(downloadrownr,propInfo.propid);
                    Msg.send({ type: 'ItemPopup' }, { tableid: tableid, itemid: itemid } );
                })
            }

            if (propInfo.relationParentTableId) {
                col.setCellClickHandler(function(fetcher,downloadrownr) {
                    var itemid=theTable.getCellValue(downloadrownr,propInfo.propid);
                    Msg.send({ type: 'ItemPopup' }, { tableid: propInfo.relationParentTableId, itemid: itemid } );
                })
            }

            if (propInfo.settings.ExternalUrl) {
                col.setCellClickHandler(function(fetcher,downloadrownr) {
                    var itemid=theTable.getCellValue(downloadrownr,propInfo.propid);
                    var urltemplate = propInfo.settings.ExternalUrl;
                    var itemids = itemid.split(";");
                    itemids.forEach(function(itemid) {
                        var url = urltemplate.DQXformat({value: itemid});
                        window.open(url,'_blank');
                    });

               }, true)
            }

            col.CellToText = propInfo.toDisplayString;
            col.CellToTextInv = propInfo.fromDisplayString;
            if (propInfo.group)
                col.GroupName = propInfo.group.Name;

            if (propInfo.isFloat) {
                if (propInfo.settings.minval || propInfo.settings.maxval) {
                    col.minval = propInfo.settings.minval;
                    col.maxval = propInfo.settings.maxval;
                    if (propInfo.settings.BarWidth)
                        col.barGraphWidth = propInfo.settings.BarWidth;
                    else {
                        if (propInfo.settings.hasValueRange)
                            col.CellToColor = createFuncFraction2Color(propInfo.settings.minval, propInfo.settings.maxval); //Create a background color that reflects the value
                    }
                }
            }

            if (propInfo.settings.MaxColumnWidth)
                col.maxColumnWidth = propInfo.settings.MaxColumnWidth;

            if (propInfo.settings.categoryColors) {
                col.CellToColor = function(val) {
                    return propInfo.mapSingleColor(val).lighten(0.5);
                }
            } else if (propInfo.isBoolean) {
                col.CellToColor = function (vl) {
                    return vl ? DQX.Color(0.88, 0.97, 0.88) : DQX.Color(1.0, 0.95, 0.9);
                }
            }

            col.checkCanSort = function() {
                var q = tableInfo;
                var isGenomePosition = false;
                if (tableInfo.hasGenomePositions)
                    if (tableInfo.PositionField == propInfo.propid)
                        isGenomePosition = true;
                if ( (!propInfo.settings.Index) && (!isGenomePosition) ) {
                    var recordCount = theTable.getRecordCount();
                    if (recordCount>1.0e6) {
                        alert('Unable to sort this column: data set is too large');
                        return false;
                    }
                    if ( (recordCount===null) || (theTable.getIsTruncatedRecordCount()) ) {
                        alert('Unable to sort this column: unknown data set size');
                        return false;
                    }
                    return true;
                }
                else
                return true;
            }

            return col;
        }


        MiscUtils.createDataItemTable = function(frameTable, tableInfo, query, settings) {
            //Initialise the data fetcher that will download the data for the table
            var theDataFetcher = DataFetchers.Table(
                MetaData.serverUrl,
                MetaData.database,
                tableInfo.getQueryTableName(settings.subSampling)
            );

            if (settings.maxResultSet) {
                theDataFetcher.setMaxRecordCount(settings.maxResultSet);
            } else {
                theDataFetcher.setMaxRecordCount(tableInfo.settings.MaxCountQueryAggregated || 1000000);
            }

            theDataFetcher.setReportIfError(true);


            var panelTable = QueryTable.Panel(
                frameTable,
                theDataFetcher,
                { leftfraction: 50 }
            );
            var theTable = panelTable.getTable();
            theTable.fetchBuffer = 300;

            theTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;

            theTable.setQuery(query);

            if (settings.hasSelection) {
                theTable.createSelectionColumn("sel", "", tableInfo.id, tableInfo.primkey, tableInfo, DQX.Color(0.8,0.2,0), function() {
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                });
            }

            $.each(MetaData.customProperties, function(idx, propInfo) {
                if (propInfo.tableid == tableInfo.id)
                    if ( (propInfo.settings.showInTable) && (tableInfo.isPropertyColumnVisible(propInfo.propid)))
                    {
                        var col = MiscUtils.createItemTableViewerColumn(theTable, tableInfo.id, propInfo.propid);
                        col.propid = propInfo.propid;
                    }
            });
            panelTable.onResize();

            return panelTable;
        }


        MiscUtils.selectQuery = function(tableInfo, theQueryObject, method) {
            if (['replace', 'add', 'restrict', 'exclude'].indexOf(method)<0)
                DQX.reportError('Invalid selection method');
            var maxcount = 100000;
            var fetcher = DataFetchers.RecordsetFetcher(
                MetaData.serverUrl,
                MetaData.database,
                tableInfo.getQueryTableName(theQueryObject.isSubSampling())
            );
            fetcher.setMaxResultCount(maxcount);

            var orderField = tableInfo.primkey;
            if (theQueryObject.isSubSampling())
                orderField = 'RandPrimKey';

            var isNumericalPrimKey = !!(MetaData.findProperty(tableInfo.id, tableInfo.primkey).isFloat);

            fetcher.addColumn(tableInfo.primkey, isNumericalPrimKey?'IN':'ST');
            DQX.setProcessing();
            fetcher.getData(theQueryObject.getForFetching(), orderField,
                function (data) { //success
                    DQX.stopProcessing();
                    var items = data[tableInfo.primkey];
                    if (items.length >= maxcount)
                        alert('WARNING: maximum number of items reached. Only {nr} will be selected'.DQXformat({nr: maxcount}))

                    if (method == 'replace') {
                        tableInfo.currentSelection = {};
                        $.each(items, function(idx, item) {
                            tableInfo.selectItem(item, true);
                        });
                    }
                    if (method == 'add') {
                        $.each(items, function(idx, item) {
                            tableInfo.selectItem(item, true);
                        });
                    }
                    if (method == 'restrict') {
                        var curSelList = tableInfo.getSelectedList();
                        var newSelMap = {};
                        $.each(items, function(idx,id) {
                            newSelMap[id] = true;
                        });
                        $.each(curSelList, function(idx,id) {
                            if (!newSelMap[id])
                                tableInfo.selectItem(id, false);
                        });
                    }
                    if (method == 'exclude') {
                        var curSelList = tableInfo.getSelectedList();
                        var newSelMap = {};
                        $.each(items, function(idx,id) {
                            newSelMap[id] = true;
                        });
                        $.each(curSelList, function(idx,id) {
                            if (newSelMap[id])
                                tableInfo.selectItem(id, false);
                        });
                    }

                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                },
                function (data) { //error
                    DQX.stopProcessing();
                    DQX.reportError('Query failed');
                }

            );
        };

        MiscUtils.createPolygonRestrictionQuery = function(origQuery, propidX, propidY, polygonPoints) {
            var qry = origQuery;

            var sign = 0;
            var notconvex = false;
            $.each(polygonPoints, function(idx, pt1) {
                pt2 = polygonPoints[(idx+1)%polygonPoints.length];
                pt3 = polygonPoints[(idx+2)%polygonPoints.length];
                var dx1 = pt2.x-pt1.x;var dy1 = pt2.y-pt1.y;
                var dx2 = pt3.x-pt2.x;var dy2 = pt3.y-pt2.y;
                var crss = dx1*dy2 - dy1*dx2;
                if (Math.abs(crss)>0) {
                    if (crss>0) {
                        if (sign<0) notconvex = true;
                        sign = 1;
                    }
                    if (crss<0) {
                        if (sign>0) notconvex = true;
                        sign = -1;
                    }
                }
            });

            if (notconvex) {
                qry = null;
//                alert('Not convex');
            }
             else {
                $.each(polygonPoints, function(idx, pt1) {
                    var pt2 = polygonPoints[(idx+1)%polygonPoints.length];
                    var dir = {
                        x: sign*(pt2.x-pt1.x),
                        y: sign*(pt2.y-pt1.y)
                    };
                    qry = MiscUtils.createHalfPlaneRestrictionQuery(qry, propidX, propidY, pt1, dir).query;
                });
            }

            return {
                query: qry
            };

        };

        MiscUtils.createHalfPlaneRestrictionQuery = function(origQuery, propidX, propidY, center, dir) {
            var qry = null;
            var selector = null;
            var dirSz = Math.abs(dir.x) + Math.abs(dir.y);
            if ( (Math.abs(dir.x/dirSz)>1.0e-9) && (Math.abs(dir.y/dirSz)>1.0e-9) ) {
                var factor = dir.y/dir.x;
                var offset = center.y - center.x*dir.y/dir.x;
                if (dir.x>0) {
                    var newStatement = SQL.WhereClause.CompareField('>FIELD');
                    selector = function(x, y) { return y > offset + factor*x }
                }
                else {
                    var newStatement = SQL.WhereClause.CompareField('<FIELD');
                    selector = function(x, y) { return y < offset + factor*x }
                }
                newStatement.ColName = propidY;
                newStatement.ColName2 = propidX;
                newStatement.Factor = factor;
                newStatement.Offset = offset;
                var qry = SQL.WhereClause.createRestriction(origQuery, newStatement);
            }
            else {
                if (dir.x>0) {
                    qry = SQL.WhereClause.createValueRestriction(origQuery, propidY, center.y, '>');
                    selector = function(x, y) { return y > center.y }
                }
                if (dir.x<0) {
                    qry = SQL.WhereClause.createValueRestriction(origQuery, propidY, center.y, '<');
                    selector = function(x, y) { return y < center.y }
                }
                if (dir.y>0) {
                    qry = SQL.WhereClause.createValueRestriction(origQuery, propidX, center.x, '<');
                    selector = function(x, y) { return x < center.x }
                }
                if (dir.y<0) {
                    qry = SQL.WhereClause.createValueRestriction(origQuery, propidX, center.x, '>');
                    selector = function(x, y) { return x > center.x }
                }
            }
            return {
                query: qry,
                selector: selector
            };
        };

        MiscUtils.createDateScaleInfo = function(optimDist, zoomFact) {
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
            dist = 1*zoomFact;
            shear = calcShear(dist);
            if (shear<minShear) {
                minShear = shear;
                rs.namedDays = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,39,31];
            }

            // try each 2 days
            dist = 2*zoomFact;
            shear = calcShear(dist);
            if (shear<minShear) {
                minShear = shear;
                rs.namedDays = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30];
            }

            // try each 5 days
            dist = 5*zoomFact;
            shear = calcShear(dist);
            if (shear<minShear) {
                minShear = shear;
                rs.namedDays = [1,5,10,15,20,25];
            }

            // try each 10 days
            dist = 10*zoomFact;
            shear = calcShear(dist);
            if (shear<minShear) {
                minShear = shear;
                rs.namedDays = [1,10,20];
            }

            // try each 15 days
            dist = 15*zoomFact;
            shear = calcShear(dist);
            if (shear<minShear) {
                minShear = shear;
                rs.namedDays = [1,15];
            }

            // try month multiples
            $.each([1,2,3,6,12], function(idx, mult) {
                dist = mult*30*zoomFact;
                shear = calcShear(dist)
                if (shear<minShear) {
                    minShear = shear;
                    rs.monthInterval = mult;
                    rs.namedDays = null;
                    rs.yearInterval = null;
                }
            })

            // try year multiples
            $.each([1,2,5,10,20,50,100,200,500,1000], function(idx, mult) {
                dist = mult*365*zoomFact;
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



        MiscUtils.createPropertyScale = function(tableid, propid, zoomFactor, minVal, maxVal) {
            var propInfo = MetaData.findProperty(tableid, propid);
            if (propInfo.isDate) {// Date scale
                var pad = function(n) {return n<10 ? '0'+n : n};
                var textScaleInfo = MiscUtils.createDateScaleInfo(80, zoomFactor);
                var tickScaleInfo = MiscUtils.createDateScaleInfo(20, zoomFactor);
                var ticks = [];
                var JD1IntMin = Math.floor(minVal);
                var JD1IntMax = Math.ceil(maxVal);
                for (var JDInt = JD1IntMin; JDInt<= JD1IntMax; JDInt++) {
                    var dt = DQX.JD2DateTime(JDInt);
                    var year = dt.getUTCFullYear();
                    var month = dt.getUTCMonth() + 1;
                    var day = dt.getUTCDate();
                    if (textScaleInfo.isOnScale(year, month, day)) {
                        var tick = {
                            value: JDInt,
                            label: year.toString()
                        };
                        ticks.push(tick);
                        if (!textScaleInfo.yearInterval)
                            tick.label2 = '-'+pad(month)+'-'+pad(day);
                    } else if (tickScaleInfo.isOnScale(year, month, day)) {
                        ticks.push({
                            value: JDInt
                        });
                    }
                }
                return ticks;
            }
            else {// Ordinary numerical scale
                var scale = DQX.DrawUtil.getScaleJump(30/zoomFactor);
                var ticks = [];
                for (var i=Math.ceil(minVal/scale.Jump1); i<=Math.floor(maxVal/scale.Jump1); i++) {
                    var tick = {};
                    tick.value = i*scale.Jump1;
                    if (i%scale.JumpReduc==0) {
                        tick.label = scale.value2String(tick.value);
                    }
                    ticks.push(tick);
                }
                return ticks;
            }
        };


        // A crosslink is of the format {datatableid}::{itemid}
        MiscUtils.parseCrossLink =function(crossLinkUrl) {
            var linkInfo = {};
            var tokens = crossLinkUrl.split('::');
            if (tokens.length!=2)
                DQX.reportError('Invalid crosslink: '+crossLinkUrl);
            linkInfo.tableid = tokens[0];
            linkInfo.itemid = tokens[1];
            var tableInfo = MetaData.mapTableCatalog[linkInfo.tableid];
            if (!tableInfo)
                DQX.reportError('Invalid crosslink: '+crossLinkUrl);
            linkInfo.dispName = tableInfo.tableNameSingle;
            return linkInfo;
        };

        MiscUtils.openCrossLink = function(crossLinkInfo) {
            if (!crossLinkInfo) return;
            if ((!crossLinkInfo.tableid)||(!crossLinkInfo.itemid)||(!MetaData.mapTableCatalog[crossLinkInfo.tableid]))
                DQX.reportError('Invalid crosslink');
            Msg.send({ type: 'ItemPopup' }, { tableid: crossLinkInfo.tableid, itemid: crossLinkInfo.itemid } );
        }

        MiscUtils.getReverseCrossLinkList = function(tableid, itemid) {
            var lst = [];
            var crossLinkUrl = tableid+'::'+itemid;
            $.each(MetaData.tableCatalog, function(idx, tbInfo) {
                $.each(tbInfo.trees, function(idx, treeInfo) {
                    if (crossLinkUrl==treeInfo.crossLink) {
                        lst.push({
                            tpe: 'tree',
                            dispName: 'tree',
                            bitmap: 'Bitmaps/unroottree.png',
                            tableid: tbInfo.id,
                            treeid: treeInfo.id
                        });
                    }
                });
            });
            return lst;
        }

        MiscUtils.openReverseCrossLink = function(info) {
            if (info.tpe=='tree') {
                Msg.send({ type: 'OpenTree' }, info );
                return;
            }
            DQX.reportError('Invalid reverse crosslink');
        };


        MiscUtils.createDocButton = function(urlFraction) {
            var bt_help = Controls.Button(null, {
                buttonClass: 'PnButtonHelp',
                //icon: 'fa-question-circle',
                bitmap:'Bitmaps/Icons/Small/documentationgreen.png', bitmapHeight:25,
                content: '<span style="color:rgb(0,120,0)"><b>Help</b></span>',
                width:80, height:35
            }).setOnChanged(function() {
                var url = MetaData.urlDocumentation + urlFraction+ '.html';
                window.open(url,'_blank');
            });
            return bt_help;
        }

        return MiscUtils;
    });



// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Utils/TableRecordSelectionManager", "Utils/TableFieldCache", "Utils/TableFullDataItemInfo", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, TableRecordSelectionManager, TableFieldCache, TableFullDataItemInfo, MetaData) {

        var Initialise = {};

        Initialise.colorFalse = DQX.Color(0.85,0.25,0);
        Initialise.colorTrue = DQX.Color(0.0,0.5,1.0);

//        alert('a');
//        var barcodecount = 2000;
//        var markercount = 40;
//        var barcodes = [];
//        for (var i=0; i<barcodecount; i++) {
//            var bc = [];
//            for (var j = 0; j<markercount; j++)
//                bc.push(Math.random());
//            barcodes.push(bc);
//        }
//        var dists = [];
//        for (var i1=0; i1<barcodecount; i1++) {
//            r1 = barcodes[i1];
//            var mrow = [];
//            for (var i2=i1+1; i2<barcodecount; i2++) {
//                r2 = barcodes[i2];
//                var sm = 0;
//                for (var j = 0; j<markercount; j++)
//                    sm += Math.abs(r1[j]-r2[j]);
//                mrow.push(sm);
//            }
//            dists.push(mrow);
//        }
//        alert('b');


        //A helper function, turning a fraction into a 3 digit text string
        var createFuncVal2Text = function(digits) {
            return function(vl) {
                if ( (vl==null) || (vl=='None') )
                    return '';
                else {
                    vl = parseFloat(vl);
                    if (isNaN(vl))
                        return '';
                    else
                        return vl.toFixed(digits);
                }
            }
        }

        Initialise._waitcount = 0;
        Initialise.incrWait = function() { Initialise._waitcount+=1; }
        Initialise.decrWait = function() { Initialise._waitcount-=1; }

        Initialise.waitForCompletion = function(proceedFunction) {
            function dowait() {
                if (Initialise._waitcount<=0)
                    proceedFunction();
                else
                    setTimeout(dowait, 50);
            }
            dowait();
        }
        Initialise.parseTableSettings = function(table) {
            var settings = { GenomeMaxViewportSizeX:50000 };
            if (table.settings) {
                //FIXME We need a proper escaping of the json
                table.settings = table.settings.replace(/`/g, '\\"');
                table.settings = table.settings.replace(/\n/g, "\\n");
                settings = $.extend(settings,JSON.parse(table.settings));
            }
            table.settings = settings;
        }

        Initialise.augmentTableInfo = function(table) {

            table.hasGenomePositions = table.IsPositionOnGenome=='1';

            if (table.defaultQuery != '')
                table.defaultQuery = SQL.WhereClause.decode(table.defaultQuery);
            else
                table.defaultQuery = SQL.WhereClause.Trivial();
            table.currentQuery = table.defaultQuery;
            table.currentSelection = {};

            table.tableNameSingle = table.name;
            table.tableNamePlural = table.name;
            if (table.settings.NameSingle)
                table.tableNameSingle = table.settings.NameSingle;
            if (table.settings.NamePlural)
                table.tableNamePlural = table.settings.NamePlural;
            table.tableCapNameSingle = table.tableNameSingle.charAt(0).toUpperCase() + table.tableNameSingle.slice(1);
            table.tableCapNamePlural = table.tableNamePlural.charAt(0).toUpperCase() + table.tableNamePlural.slice(1);

            table.fieldCache = TableFieldCache.Create(table);

            table._fullDataItemInfo = TableFullDataItemInfo.create(table);

            // Use the following function to download the full content of the datatable, and be notified on completion
            table.loadFullDataItemInfo = function(onCompleted) {
                table._fullDataItemInfo.get(onCompleted);
            };

            table.hasGenomeRegions = !!(table.settings.IsRegionOnGenome);

            if (table.hasGenomePositions) {
                table.ChromosomeField = table.settings.Chromosome || 'chrom';
                table.PositionField = table.settings.Position || 'pos';
            }

            if (table.hasGenomeRegions || table.hasGenomePositions)
                table.genomeBrowserInfo = {};

            table.quickFindFields = [table.primkey];
            if ('QuickFindFields' in table.settings)
                table.quickFindFields = table.settings.QuickFindFields.split(',');


            table.isItemSelected = function(id) { return table.currentSelection[id]; }

            table.selectItem = function(id, newState) {
                if (newState)
                    table.currentSelection[id] = true;
                else
                    delete table.currentSelection[id];
            }

            table.clearSelection = function(id, newState) {
                table.currentSelection = {};
            }

            table.getSelectedCount = function() {
                var cnt = 0;
                $.each(table.currentSelection, function(key, val) {
                    if (val)
                        cnt += 1;
                });
                return cnt;
            }

            table.getSelectedList = function() {
                var activeList = [];
                $.each(table.currentSelection, function(key, val) {
                    if (val)
                        activeList.push(key);
                });
                return activeList;
            }

            table.colIsHidden = {};

            table.isPropertyColumnVisible = function(propid) {
                return !table.colIsHidden[propid];
            }

            table.setPropertyColumnVisible = function(propid, isVisible) {
                table.colIsHidden[propid] = !isVisible;
            }



            table.storeSettings = function() {
                var settObj = {};
                settObj.tableBasedSummaryValues = {}
                settObj.tableBasedSummaryValues.selection = table.genomeTrackSelectionManager.storeSettings();
                return settObj;
            }

            table.recallSettings = function(settObj) {
                if (settObj.tableBasedSummaryValues) {
                    if (settObj.tableBasedSummaryValues.selection)
                        table.genomeTrackSelectionManager.recallSettings(settObj.tableBasedSummaryValues.selection);
                }
            }

            table.getQueryTableName = function(forSubSampling) {
                if (!forSubSampling) {
                    return table.id  + 'CMB_' + MetaData.workspaceid;
//                    return table.id;
                }
                else {
                    return table.id  + 'CMBSORTRAND_' + MetaData.workspaceid;
//                    return table.id+'_SORTRAND';
                }
            }

            //Returns a query clause that restricts to a given subset
            table.createSubsetWhereclause = function(subsetid) {
                var wc = SQL.WhereClause.InSubset();
                wc.SubsetTable = table.id + '_subsets';
                wc.PrimKey = table.primkey;
                wc.Subset = subsetid;
                return wc;
            }

            //Returns a query clause that restricts to items having a note with specific text
            table.createNoteWhereclause = function(notetext) {
                var wc = SQL.WhereClause.NoteContains();
                wc.NoteItemTable = table.id;
                wc.PrimKey = table.primkey;
                wc.NoteText = notetext;
                return wc;
            }

            table.createQueryDisplayString = function(qry) {
                if ((!qry) || (qry.isTrivial))
                    return 'All';
                var nameMap = {};
                $.each(MetaData.customProperties,function(idx, propInfo) {
                    if (propInfo.tableid == table.id)
                        nameMap[propInfo.propid] = {
                            name: propInfo.name,
                            toDisplayString: propInfo.toDisplayString
                        };
                });
                var subsetMap = {};
                $.each(table.storedSubsets, function(idx, subset) {
                    subsetMap[subset.id] = {
                        name: subset.name
                    };
                });
                var queryData = {
                    fieldInfoMap: nameMap,
                    subsetMap: subsetMap
                };
                return qry.toQueryDisplayString(queryData, 0);
                // qry.toQueryDisplayString(nameMap,0)
            }

            table.createIcon = function(settings) {
                var dv = DocEl.Div();
                dv.setCssClass("DatasetIcon");
                dv.addStyle('position','relative');
                if (table.settings.Icon)
                    dv.addElem('<span class="fa {icon}" style="line-height: inherit;font-size: 30px;/*text-shadow:-1px -1px 0px rgb(110,110,110);*/"></span>'.DQXformat({icon:table.settings.Icon}));
                else {
                    dv.addElem(table.settings.LetterCode);
                }
//                dv.addElem('<span class="fa fa-table" style="line-height: inherit;font-size: 14px;position:absolute;left:2px;top:-14px;color:rgb(140,140,140)"></span>');
                if (settings && settings.floatLeft) {
                    dv.addStyle("float", "left");
                    dv.addStyle('margin-right', '10px');
                    dv.addStyle('margin-bottom', '5px');
                }
                return dv.toString();
            };

            table.propertyGroups = [];
            table.propertyGroupMap = {};
            if (table.settings.PropertyGroups) {
                $.each(table.settings.PropertyGroups, function(idx, groupInfo) {
                    groupInfo.properties = [];
                    table.propertyGroups.push(groupInfo);
                    table.propertyGroupMap[groupInfo.Id] = groupInfo;
                });
            }

        }

        Initialise.augment2DTableInfo = function(table) {
            table.tableNameSingle = table.name;
            table.tableNamePlural = table.name;
            if (table.settings.NameSingle)
                table.tableNameSingle = table.settings.NameSingle;
            if (table.settings.NamePlural)
                table.tableNamePlural = table.settings.NamePlural;
            table.tableCapNameSingle = table.tableNameSingle.charAt(0).toUpperCase() + table.tableNameSingle.slice(1);
            table.tableCapNamePlural = table.tableNamePlural.charAt(0).toUpperCase() + table.tableNamePlural.slice(1);

            table.col_table = MetaData.mapTableCatalog[table.col_table];
            table.row_table = MetaData.mapTableCatalog[table.row_table];
            table.hasGenomePositions = table.col_table.hasGenomePositions;
            if (table.hasGenomePositions)
                table.genomeBrowserInfo = {};

            var settings = {};
            if (table.settings)
                settings = $.extend(settings,JSON.parse(table.settings));
                settings.GenomeMaxViewportSizeX = parseInt(settings.GenomeMaxViewportSizeX);
            table.settings = settings;
        };


        Initialise.createLetterCodes = function() {
            var usedCodes = []
            $.each(MetaData.tableCatalog, function(idx, table) {
                if (table.settings.LetterCode)
                    usedCodes.push(table.settings.LetterCode);
            });
            $.each(MetaData.tableCatalog, function(idx, table) {
                if (!table.settings.LetterCode) {
                    table.settings.LetterCode = 'Xx';
                    if (table.tableCapNamePlural && (table.tableCapNamePlural.length>1)) {
                        table.settings.LetterCode = '';
                        var secondCandidates = [];
                        var tokens = table.tableCapNamePlural.split(' ');
                        if (tokens.length>1)
                            secondCandidates.push(tokens[1][0]);
                        for (var i=1; i<table.tableCapNamePlural.length; i++)
                            secondCandidates.push(table.tableCapNamePlural[i]);
                        $.each(secondCandidates, function(idx, letter) {
                            if (!table.settings.LetterCode) {
                                var candid = table.tableCapNamePlural[0] + letter;
                                if (usedCodes.indexOf(candid, 0)<0)
                                    table.settings.LetterCode = candid;
                            }
                        });
                    }
                }
            });
        };


        Initialise.parseSummaryValues = function() {
            $.each(MetaData.summaryValues, function(idx, summaryValue) {
                if (summaryValue.minval)
                    summaryValue.minval = parseFloat(summaryValue.minval);
                else
                    summaryValue.minval = 0;
                if (summaryValue.maxval)
                    summaryValue.maxval = parseFloat(summaryValue.maxval);
                else
                    summaryValue.maxval = 0;
                summaryValue.minblocksize = parseFloat(summaryValue.minblocksize);
                summaryValue.isCustom = true;
                var settings = { channelColor:'rgb(0,0,180)' };
                if (summaryValue.settings)
                    settings = $.extend(settings,JSON.parse(summaryValue.settings));
                summaryValue.settings = settings;
            });

        };


        Initialise.parseCustomProperties = function() {
            $.each(MetaData.customProperties, function(idx, prop) {
                var tableInfo = MetaData.mapTableCatalog[prop.tableid];
                prop.isCustom = (prop.source=='custom');
                if (prop.datatype=='Text')
                    prop.isText = true;
                if ((prop.datatype=='Value') || (prop.datatype=='LowPrecisionValue')|| (prop.datatype=='HighPrecisionValue') || (prop.datatype=='GeoLongitude') || (prop.datatype=='GeoLattitude') || (prop.datatype=='Date') )
                    prop.isFloat = true;
                if (prop.datatype=='Boolean')
                    prop.isBoolean = true;
                if (prop.datatype=='Date')
                    prop.isDate = true;
                if (!prop.name) prop.name = prop.propid;
                var settings = { showInTable: true, showInBrowser: false, channelName: '', channelColor:'rgb(0,0,0)', connectLines: false };
                if (prop.isFloat) {
                    settings.minval = 0;
                    settings.maxval = 1;
                    settings.decimDigits = 2;
                };
                if (prop.datatype=='GeoLongitude') {
                    settings.minval = 0;
                    settings.maxval = 360;
                    settings.decimDigits = 5;
                    tableInfo.propIdGeoCoordLongit = prop.propid;
                }
                if (prop.datatype=='GeoLattitude') {
                    settings.minval = -90;
                    settings.maxval = 90;
                    settings.decimDigits = 5;
                    tableInfo.propIdGeoCoordLattit = prop.propid;
                }
                if (prop.propid == MetaData.getTableInfo(prop.tableid).primkey)
                    prop.isPrimKey = true;
                if (prop.settings) {
                    try {
                        var settingsObj = JSON.parse(prop.settings);
                        if ('maxval' in settingsObj)
                            settingsObj.hasValueRange = true;
                    }
                    catch(e) {
                        alert('Invalid settings string for {table}.{propid}: {sett}\n{msg}'.DQXformat({
                            table:prop.tableid,
                            propid:prop.propid,
                            sett:prop.settings,
                            msg:e
                        }));
                    }
                    settings = $.extend(settings,settingsObj);
                }
                prop.settings = settings;
                prop.toDisplayString = function(vl) { return vl; }

                // Human friendly data type string
                prop.dispDataType = 'Text';
                if (prop.settings.isCategorical)
                    prop.dispDataType = 'Categorical';
                if (prop.isFloat)
                    prop.dispDataType = 'Value';
                if (prop.isBoolean)
                    prop.dispDataType = 'Boolean';
                if (prop.isDate)
                    prop.dispDataType = 'Date';
                if (prop.datatype=='GeoLongitude')
                    prop.dispDataType = 'Longitude';
                if (prop.datatype=='GeoLattitude')
                    prop.dispDataType = 'Latitude';

                //Assign grouperty group
                prop.group = null;
                if (prop.settings.GroupId)
                    if (tableInfo.propertyGroupMap[prop.settings.GroupId]) {
                        prop.group = tableInfo.propertyGroupMap[prop.settings.GroupId];
                        tableInfo.propertyGroupMap[prop.settings.GroupId].properties.push(prop);
                    }
                if (!prop.group) {
                    if (!tableInfo.propertyGroupMap['']) {
                        var grp = {Id:'', Name: 'Properties', properties: []};
                        tableInfo.propertyGroupMap[''] = grp;
                        tableInfo.propertyGroups.push(grp);
                    }
                    prop.group = tableInfo.propertyGroupMap[''];
                    tableInfo.propertyGroupMap[''].properties.push(prop);
                }

                // Determine table name where the column is originally defined
                if (prop.source == 'fixed') {
                    prop.originalTableName = prop.tableid;
                }
                else {
                    prop.originalTableName = prop.tableid + 'INFO_' + MetaData.workspaceid;
                }



                if (prop.isFloat) {
                    prop.toDisplayString = createFuncVal2Text(prop.settings.decimDigits);
                    if (prop.settings.decimDigits == 0)
                        prop.isInt = true;
                }

                if (prop.isBoolean)
                    prop.toDisplayString = function(vl) {
                        if (vl == 'Yes') return vl;
                        return parseInt(vl)?'Yes':'No';
                    }

                if (prop.isDate) {
                    tableInfo.hasDate = true;
                    prop.toDisplayString = function(vl) {
                        if ((vl==null) || (vl=='None'))
                            return '';
                        var dt = DQX.JD2DateTime(parseFloat(vl));
                        if (isNaN(dt.getTime()))
                            return "2000-01-01";
                        var pad = function(n) {return n<10 ? '0'+n : n};
                        return dt.getUTCFullYear()
                            + '-' + pad( dt.getUTCMonth() + 1 )
                            + '-' + pad( dt.getUTCDate() );
                    }
                    prop.fromDisplayString = function(str) {
                        var year = parseInt(str.substring(0,4));
                        var month = parseInt(str.substring(5,7));
                        var day = parseInt(str.substring(8,10));
                        if (isNaN(year)) year=2000;
                        if (isNaN(month)) month=1;
                        if (isNaN(day)) day=1;
                        return DQX.DateTime2JD(new Date(year, month-1, day, 6, 0, 0));
                    }
                }

                prop.category2Color = DQX.PersistentAssociator(DQX.standardColors.length);

                prop.mapSingleColor = function(value) {
                    if (prop.settings.categoryColors) {
                        var cl = prop.settings.categoryColors[value];
                        if (cl) return DQX.colourFromString(cl);
                        return DQX.Color(0.5,0.5,0.5);
                    }
                    if (prop.isBoolean) {
                        if ((!value)||(value=='No')||(value=='0')||(value=='-None-'))
                            return Initialise.colorFalse;
                        else
                            return Initialise.colorTrue;
                    }
                    //Create automatic map based on standard colors
                    var colormapper = prop.category2Color;
                    var idx = colormapper.get(value);
                    if (idx>=0)
                        return DQX.standardColors[idx];
                    return DQX.Color(0.5,0.5,0.5);
                };

                prop.mapColors = function(valueList) {
                    if (prop.isFloat&&(prop.settings.maxval!=prop.settings.minval)) {
                        clCount = 100;
                        var colors = []
                        for (var i=0; i<clCount; i++) {
                            fr = i*1.0/(clCount-1);
                            colors.push(DQX.HSL2Color(0.5-fr*0.75,0.6,0.5));
                        }
                        colors.push(DQX.Color(0.5,0.5,0.5));
                        var absentColIndex = colors.length-1;
                        var catData = [];
                        var range = prop.settings.maxval-prop.settings.minval;
                        for (var i=0; i<valueList.length; i++) {
                            if (valueList[i]!=null) {
                                var fr = (valueList[i]-prop.settings.minval)/range;
                                var clidx = Math.round(fr*(clCount-1));
                                if (clidx<0) clidx = 0;
                                if (clidx>=clCount) clidx = clCount-1;
                            }
                            else
                                var clidx = absentColIndex;
                            catData.push(clidx);
                        }
                        var legend = [];
                        var scale = DQX.DrawUtil.getScaleJump(range/20);
                        for (var i=Math.ceil(prop.settings.minval/scale.Jump1); i<=Math.floor(prop.settings.maxval/scale.Jump1); i++) {
                            if (i%scale.JumpReduc==0) {
                                var value = i*scale.Jump1;
                                var fr = (value-prop.settings.minval)/range;
                                legend.push({ state: scale.value2String(value), color: DQX.HSL2Color(0.5-fr*0.75,0.6,0.5) });
                            }
                        }
                        return { indices:catData, colors: colors, legend: legend };
                    }

                    //For text data
                    if (prop.settings.categoryColors) {
                        // Use pre-defined state colors from settings
                        var colors = [];
                        var colmap = {};
                        var defaultColor = DQX.Color(0.5,0.5,0.5);
                        if (prop.settings.categoryColors['_other_'])
                            defaultColor = DQX.parseColorString(prop.settings.categoryColors['_other_'], DQX.Color(0.0,0.5,0.5));
                        $.each(prop.settings.categoryColors, function(state, colorstr) {
                            if (state!='_other_') {
                                colors.push(DQX.parseColorString(colorstr, DQX.Color(0.5,0.5,0.5)));
                                colmap[state] = colors.length;
                            }
                        });
                        colors.push(defaultColor);
                        var defaultindex = colors.length;
                        var catData = [];
                        for (var i=0; i<valueList.length; i++) {
                            var clidx = colmap[prop.toDisplayString(valueList[i])];
                            if (!clidx)
                                clidx = defaultindex;
                            catData.push(clidx-1);
                        }
                        var legend = [];
                        $.each(prop.settings.categoryColors, function(state, color) {
                            if (state!='_other_') {
                                legend.push({ state: state, color: color });
                            }
                        });
                        return { indices:catData, colors: colors, legend: legend };
                    }

                    if (prop.isBoolean) {
                        var catData = [];
                        for (var i=0; i<valueList.length; i++) {
                            if ((!valueList[i])||(valueList[i]=='No'))
                                catData.push(0);
                            else
                                catData.push(1);
                        }
                        return {
                            indices:catData,
                            colors: [Initialise.colorFalse, Initialise.colorTrue],
                            legend: [ {state:'No', color:Initialise.colorFalse}, {state:'Yes', color:Initialise.colorTrue} ] };
                    }

                    //Create automatic map based on standard colors
                    var uniqueCatMap = {};
                    var uniqueCats = []
                    for (var i=0; i<valueList.length; i++) {
                        if (!uniqueCatMap[valueList[i]]) {
                            uniqueCatMap[valueList[i]] = true;
                            uniqueCats.push(valueList[i]);
                        }
                    }
                    var colormapper = prop.category2Color;
                    colormapper.map(uniqueCats);
                    var catData = [];
                    for (var i=0; i<valueList.length; i++) {
                        var idx = colormapper.get(valueList[i]);
                        if (idx<0)
                            idx = colormapper.itemCount-1;
                        catData.push(idx);
                    }
                    var legend = [];
                    $.each(colormapper.getAssociations(), function(state, coloridx) {
                        legend.push({ state: prop.toDisplayString(state), color: DQX.standardColors[coloridx] });
                    });
                    return { indices:catData, colors: DQX.standardColors, legend: legend };
                }

                if (prop.settings.isCategorical) {
                    var getter = DataFetchers.ServerDataGetter();
                    getter.addTable(prop.originalTableName,
                        [prop.propid],
                        prop.propid,
                        SQL.WhereClause.Trivial(), { distinct:true }
                    );
                    prop.propCategories = [];
                    Initialise.incrWait();
                    getter.execute(MetaData.serverUrl,MetaData.database,
                        function() {
                            var records = getter.getTableRecords(prop.originalTableName);
                            $.each(records, function(idx, rec) {
                                prop.propCategories.push(rec[prop.propid]);
                            });
                            Initialise.decrWait();
                        }
                    );
                }
                tableInfo.properties = tableInfo.properties || [];
                tableInfo.properties.push(prop)
            });

            // Determine of datatables have geographic info
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                if (tableInfo.propIdGeoCoordLongit && tableInfo.propIdGeoCoordLattit)
                    tableInfo.hasGeoCoord = true;
            });


        }

        Initialise.parse2DProperties = function() {
            $.each(MetaData.twoDProperties, function(idx, prop) {
                var settings = { showInTable: true, showInBrowser: false};
                if (prop.settings) {
                    try {
                        var settingsObj = JSON.parse(prop.settings);
                    }
                    catch(e) {
                        alert('Invalid settings string for {table}.{propid}: {sett}\n{msg}'.DQXformat({
                            table:prop.tableid,
                            propid:prop.propid,
                            sett:prop.settings,
                            msg:e
                        }));
                    }
                    settings = $.extend(settings,settingsObj);
                }
                prop.settings = settings;
                prop.toDisplayString = function(vl) { return vl; };
                var table = MetaData.map2DTableCatalog[prop.tableid];
                table.properties = table.properties || {};
                table.properties[prop.id] = prop;

            });
        };

        Initialise.parseRelations = function(data) {
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                tableInfo.relationsChildOf = [];
                tableInfo.relationsParentOf = [];
            });
            MetaData.relations = data;
            $.each(data, function(idx, relationInfo) {
                var childTableInfo = MetaData.mapTableCatalog[relationInfo.childtableid];
                    if (!childTableInfo)
                        DQX.reportError('Invalid child table in relation: '+relationInfo.childtableid)
                var parentTableInfo = MetaData.mapTableCatalog[relationInfo.parenttableid];
                if (!parentTableInfo)
                    DQX.reportError('Invalid parent table in relation: '+relationInfo.parenttableid)
                childTableInfo.relationsChildOf.push(relationInfo);
                parentTableInfo.relationsParentOf.push(relationInfo);
                MetaData.findProperty(childTableInfo.id, relationInfo.childpropid).relationParentTableId = parentTableInfo.id;
            });
        };

        Initialise.parseStoredSubsets = function(data) {
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                tableInfo.storedSubsets = [];
            });
            $.each(data, function(idx, subsetInfo) {
                var tableInfo = MetaData.mapTableCatalog[subsetInfo.tableid];
                if (tableInfo) {
                    tableInfo.storedSubsets.push({
                        id: subsetInfo.subsetid,
                        name: subsetInfo.name,
                        membercount: null
                    });
                }
            });
            //Fetch member count of each subset
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'subset_fetchallmembercounts',
                {
                    database: MetaData.database,
                    workspaceid: MetaData.workspaceid
                }, function(resp) {
                    MetaData.subset_membercount_maxcount = resp['maxcount'];
                    $.each(resp.info, function(tableid, subsetinfo) {
                        var tableInfo = MetaData.mapTableCatalog[tableid];
                        $.each(tableInfo.storedSubsets, function(idx, subset) {
                            if (subsetinfo[subset.id])
                                subset.membercount = subsetinfo[subset.id];
                            else
                                subset.membercount = 0;
                        })
                    });
            });
        };


        Initialise.parseTableBasedSummaryValues = function() {


            $.each(MetaData.tableCatalog, function(idx, table) {
                table.tableBasedSummaryValues = [];
                table.mapTableBasedSummaryValues = {};
                table.genomeTrackSelectionManager = TableRecordSelectionManager.Create(
                    table.id+'_genometracks',
                    table, function(id) {
                        Msg.broadcast({ type: 'TableBasedSummaryValueSelectionChanged' }, {
                            tableid:table.id,
                            recordid:id
                        });
                    });
            });

            $.each(MetaData.tableBasedSummaryValues, function(idx, tableSummaryValue) {
                if (tableSummaryValue.minval)
                    tableSummaryValue.minval = parseFloat(tableSummaryValue.minval);
                else
                    tableSummaryValue.minval = 0;
                if (tableSummaryValue.maxval)
                    tableSummaryValue.maxval = parseFloat(tableSummaryValue.maxval);
                else
                    tableSummaryValue.maxval = 1;
                tableSummaryValue.minblocksize = parseFloat(tableSummaryValue.minblocksize);
                var settings = { channelColor:'rgb(0,0,180)' };
                if (tableSummaryValue.settings) {
                    try{
                        var settObj = JSON.parse(tableSummaryValue.settings);
                        settings = $.extend(settings,settObj);
                    }
                    catch(e) {
                        DQX.reportError('Invalid settings string "{str}" for tablebasedsummaryvalues {tableid},{trackid}:\n{error}'.DQXformat({
                            str:tableSummaryValue.settings,
                            tableid:tableSummaryValue.tableid,
                            trackid:tableSummaryValue.trackid,
                            error:e
                        }));
                    }
                }
                tableSummaryValue.settings = settings;
                tableSummaryValue.isVisible = tableSummaryValue.settings.defaultVisible;

                var tableInfo = MetaData.getTableInfo(tableSummaryValue.tableid);
                tableInfo.tableBasedSummaryValues.push(tableSummaryValue);
                tableInfo.mapTableBasedSummaryValues[tableSummaryValue.trackid] = tableSummaryValue;
            });
        };




        return Initialise;
    });



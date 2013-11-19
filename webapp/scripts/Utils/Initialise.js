define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Utils/TableRecordSelectionManager", "Utils/TableFieldCache", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, TableRecordSelectionManager, TableFieldCache, MetaData) {

        var Initialise = {};


        //A helper function, turning a fraction into a 3 digit text string
        var createFuncVal2Text = function(digits) {
            return function(vl) {
                if ( (vl==null) || (vl=='None') )
                    return '-';
                else
                    return parseFloat(vl).toFixed(digits);
            }
        }

        Initialise.augmentTableInfo = function(table) {
            table.hasGenomePositions = table.IsPositionOnGenome=='1';
            table.currentQuery = SQL.WhereClause.Trivial();
            table.currentSelection = {};
            if (table.hasGenomePositions)
                table.genomeBrowserInfo = {};

            var settings = { GenomeMaxViewportSizeX:50000 };
            if (table.settings)
                settings = $.extend(settings,JSON.parse(table.settings));
            table.settings = settings;

            table.fieldCache = TableFieldCache.Create(table);

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

            table.getSelectedList = function() {
                var activeList = [];
                $.each(table.currentSelection, function(key, val) {
                    if (val)
                        activeList.push(key);
                });
                return activeList;
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
        }



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
                prop.isCustom = (prop.source=='custom');
                if (prop.datatype=='Text')
                    prop.isText = true;
                if (prop.datatype=='Value')
                    prop.isFloat = true;
                if (prop.datatype=='Boolean')
                    prop.isBoolean = true;
                if (!prop.name) prop.name = prop.propid;
                var settings = { showInTable: true, showInBrowser: false, channelName: '', channelColor:'rgb(0,0,0)', connectLines: false };
                if (prop.isFloat) {
                    settings.showInBrowser = true;
                    settings.minval = 0;
                    settings.maxval = 1;
                    settings.decimDigits = 2;
                };
                if (prop.propid == MetaData.mapTableCatalog[prop.tableid].primkey)
                    prop.isPrimKey = true;
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
                prop.toDisplayString = function(vl) { return vl; }
                if (prop.isFloat)
                    prop.toDisplayString = createFuncVal2Text(prop.settings.decimDigits);
                if (prop.isBoolean)
                    prop.toDisplayString = function(vl) { return parseInt(vl)?'Yes':'No'; }
                prop.category2Color = DQX.PersistentAssociator(DQX.standardColors.length);

                if (prop.settings.isCategorical) {
                    var getter = DataFetchers.ServerDataGetter();
                    getter.addTable(prop.tableid,[prop.propid],prop.propid,
                        SQL.WhereClause.Trivial(), { distinct:true }
                    );
                    prop.propCategories = [];
                    getter.execute(MetaData.serverUrl,MetaData.database,
                        function() {
                            $.each(getter.getTableRecords(prop.tableid), function(idx, rec) {
                                prop.propCategories.push(rec[prop.propid]);
                            });
                            var q=0;
                        }
                    );
                }

            });
        }


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

                var tableInfo = MetaData.mapTableCatalog[tableSummaryValue.tableid];
                tableInfo.tableBasedSummaryValues.push(tableSummaryValue);
                tableInfo.mapTableBasedSummaryValues[tableSummaryValue.trackid] = tableSummaryValue;
            });
        };




        return Initialise;
    });



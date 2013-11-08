define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Utils/TableRecordSelectionManager", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, TableRecordSelectionManager, MetaData) {

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
            });

            $.each(MetaData.tableBasedSummaryValues, function(idx, tableSummaryValue) {
                var tableInfo = MetaData.mapTableCatalog[tableSummaryValue.tableid];
                tableInfo.tableBasedSummaryValues.push(tableSummaryValue);
                tableSummaryValue.selectionManager = TableRecordSelectionManager.Create(tableSummaryValue.tableid+'_'+tableSummaryValue.trackid, tableInfo);
                tableInfo.mapTableBasedSummaryValues[tableSummaryValue.trackid] = tableSummaryValue;
                var q=0;
/*                if (summaryValue.minval)
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
                summaryValue.settings = settings;*/
            });
        };




        return Initialise;
    });



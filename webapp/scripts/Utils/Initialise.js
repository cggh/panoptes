define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

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
                if (prop.settings)
                    settings = $.extend(settings,JSON.parse(prop.settings));
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



        return Initialise;
    });



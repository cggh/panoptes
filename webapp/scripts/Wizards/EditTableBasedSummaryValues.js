define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, QueryTable, QueryBuilder, DataFetchers, DocEl, DQX, Wizard, Popup, PopupFrame, MetaData) {

        var EditTableBasedSummaryValues = {};


        EditTableBasedSummaryValues.CreateDialogBox = function(tableid) {
            var that = PopupFrame.PopupFrame('EditTableBasedSummaryValues', {title:'Genome tracks', blocking:true, sizeX:700, sizeY:500 });
            that.tableInfo = MetaData.mapTableCatalog[tableid];

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {
                //that.panelBody = Framework.Form(that.frameBody).setPadding(10);
                that.panelButtons = Framework.Form(that.frameButtons);


                var bt_close = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Close', bitmap: DQX.BMP('ok.png'), width:80, height:25 }).setOnChanged(function() {
                    that.close();
                });
                that.panelButtons.addControl(Controls.AlignRight(Controls.CompoundHor([
                    bt_close,
                    Controls.HorizontalSeparator(7)
                ])));


                //Initialise the data fetcher that will download the data for the table
                if (!that.tableInfo.summaryValuesTableFetcher) {
                    that.tableInfo.summaryValuesTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableInfo.id
                    );
                }

                that.panelTable = QueryTable.Panel(
                    that.frameBody,
                    that.tableInfo.summaryValuesTableFetcher,
                    { leftfraction: 50 }
                );
                that.myTable = that.panelTable.getTable();// A shortcut variable
                that.myTable.fetchBuffer = 300;
                that.myTable.immediateFetchRecordCount = false;
                that.myTable.setQuery(SQL.WhereClause.Trivial());


                //Create the selection columns for all genome tracks that are associated with records in this table
                $.each(that.tableInfo.tableBasedSummaryValues, function(idx, summaryValue) {
                    that.myTable.createSelectionColumn(
                        summaryValue.trackid,
                        summaryValue.trackname,that.tableInfo.id, that.tableInfo.primkey,
                        summaryValue.selectionManager,
                        function() {
                            that.myTable.render();
                        });
                });

                var propids = ['ox_code', 'src_code', 'country'];

                $.each(propids, function(idx,propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id,propid);
                    var col = that.myTable.createTableColumn(
                        QueryTable.Column(
                            propInfo.name,propid,1),
                        'String',//!!! todo: adapt this to datatype, see TableViewer
                        true
                    );
                });


                that.myTable.reLoadTable();
                that.panelTable.onResize();

            };

            that.onOK = function() {
                var query = that.builder.getQuery();
                that.close();
            }

            that.create();

            return that;
        }



        return EditTableBasedSummaryValues;
    });




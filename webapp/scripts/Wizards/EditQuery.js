define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, MetaData) {

        var EditQuery = {};


        EditQuery.CreateDialogBox = function(tableid, query, proceedFunction) {
            var that = PopupFrame.PopupFrame('editquery', {title:'Edit query', blocking:true, sizeX:700, sizeY:500 });
            that.tableInfo = MetaData.mapTableCatalog[tableid];
            that.query = query;

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

                that.builder = MetaData.mapTableCatalog[that.tableInfo.id].tableViewer.panelTable.createPanelAdvancedQuery(that.frameBody, function() {
                }, true);
                that.builder.setQuery(that.query);

                var bt_cancel = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Cancel', bitmap: DQX.BMP('cancel.png'), width:80, height:25 }).setOnChanged(function() {
                    that.close();
                });
                var bt_apply = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Apply', bitmap: DQX.BMP('apply.png'), width:80, height:25 }).setOnChanged(function() {
                    var query = that.builder.getQuery();
                    proceedFunction(query);
                });
                var bt_ok = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'OK', bitmap: DQX.BMP('ok.png'), width:80, height:25 }).setOnChanged(that.onOK);
                that.panelButtons.addControl(Controls.AlignRight(Controls.CompoundHor([
                    bt_cancel,
                    Controls.HorizontalSeparator(10),
                    bt_apply,
                    bt_ok,
                    Controls.HorizontalSeparator(7)
                ])));

            };

            that.onOK = function() {
                var query = that.builder.getQuery();
                that.close();
                proceedFunction(query);
            }

            that.create();

            return that;
        }



        return EditQuery;
    });




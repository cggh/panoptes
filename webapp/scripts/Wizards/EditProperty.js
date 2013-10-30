define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, MetaData) {

        var EditProperty = {};


        EditProperty.execute = function(tableid, propid) {
            var str = 'Property identifier: "'+propid+'"<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Edit definition...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
                EditProperty.editProperty(tableid, propid);
            });
            str += bt.renderHtml();

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Delete...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
                EditProperty.delProperty(tableid, propid);
            });
            str += bt.renderHtml();

            var popupid = Popup.create('Edit property',str);
        };

        EditProperty.delProperty = function(tableid, propid) {
            if (confirm('Are you sure you want to permanently delete property "{id}"'.DQXformat({ id:propid }))) {
                var data = {};
                data.database =  MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.propid = propid;
                data.tableid = tableid;
                asyncRequest("property_del", data, function() {
                    Msg.send({ type: 'ReloadChannelInfo' });
                });
            }
        };

        EditProperty.editProperty = function(tableid, propid) {
            var frame = EditProperty.CreatePropertyDialogBox(tableid, propid);
            frame.create();
        };



        EditProperty.CreatePropertyDialogBox = function(tableid, propid) {
            var that = PopupFrame.PopupFrame('propedit', {title:'Edit property', blocking:true, sizeX:550, sizeY:550 });

            that.propInfo = MetaData.findProperty(tableid, propid);
            that.tableInfo = MetaData.mapTableCatalog[tableid];

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 90);
            };

            that.createPanels = function() {
                that.panelBody = Framework.Form(that.frameBody).setPadding(10);
                that.panelButtons = Framework.Form(that.frameButtons);

                var grouper = Controls.CompoundVert([]).setMargin(25);



                // General settings
                var grp_general  = Controls.CompoundVert([]);
                grp_general.setLegend('General').setAutoFillX(true).setMargin(10);
                grouper.addControl(grp_general);

                that.ctrl_name = Controls.Edit(null,{ size: 30, value: that.propInfo.name });
                grp_general.addControl(Controls.CompoundHor([Controls.Static('Name:&nbsp;&nbsp;'), that.ctrl_name]));

                if (that.propInfo.isFloat) {
                    that.ctrl_minval = Controls.Edit(null,{ size: 6, value: that.propInfo.settings.minval });
                    that.ctrl_maxval = Controls.Edit(null,{ size: 6, value: that.propInfo.settings.maxval });
                    grp_general.addControl(Controls.CompoundHor([Controls.Static('Value range:&nbsp;&nbsp;'), that.ctrl_minval, Controls.Static('&nbsp;&nbsp;-&nbsp;&nbsp;'), that.ctrl_maxval]));
                    that.ctrl_decimdigits = Controls.Edit(null,{ size: 6, value: that.propInfo.settings.decimDigits });
                    grp_general.addControl(Controls.CompoundHor([Controls.Static('Decimal digits:&nbsp;&nbsp;'), that.ctrl_decimdigits]));
                }


                // Table settings
                var grp_table  = Controls.CompoundVert([]);
                grp_table.setLegend('Table view').setAutoFillX(true).setMargin(10);
                grouper.addControl(grp_table);

                that.ctrl_showInTable = Controls.Check(null,{ label: 'Show in table',value: that.propInfo.settings.showInTable });
                grp_table.addControl(that.ctrl_showInTable);



                // Genome browser settings
                if (that.tableInfo.hasGenomePositions) {
                    var grp_browser  = Controls.CompoundVert([]);
                    grp_browser.setLegend('Genome browser view').setAutoFillX(true).setMargin(10);
                    grouper.addControl(grp_browser);

                    that.ctrl_showInBrowser = Controls.Check(null,{ label: 'Show in browser', value: that.propInfo.settings.showInBrowser });
                    grp_browser.addControl(that.ctrl_showInBrowser);

                    that.ctrl_channelName = Controls.Edit(null,{ size: 30, value: that.propInfo.settings.channelName });
                    grp_browser.addControl(Controls.CompoundHor([Controls.Static('Channel name:&nbsp;&nbsp;'), that.ctrl_channelName]));

                    that.ctrl_channelColor = Controls.ColorPicker(null, {label: 'Color', value: DQX.parseColorString(that.propInfo.settings.channelColor) });
                    grp_browser.addControl(that.ctrl_channelColor);

                    that.ctrl_connectLines = Controls.Check(null,{ label: 'Connect lines', value: that.propInfo.settings.connectLines });
                    grp_browser.addControl(that.ctrl_connectLines);
                }


                that.panelBody.addControl(grouper);

                var bt_ok = Controls.Button(null, { content: 'OK'}).setOnChanged(that.onOK);
                that.panelButtons.addControl(bt_ok);
            };

            that.onOK = function() {

                var settings = {};
                settings.showInTable = that.ctrl_showInTable.getValue();
                if (that.tableInfo.hasGenomePositions) {
                    settings.showInBrowser = that.ctrl_showInBrowser.getValue();
                    settings.channelName = that.ctrl_channelName.getValue();
                    settings.channelColor = that.ctrl_channelColor.getValue().toString();
                    if (that.propInfo.isFloat) {
                        settings.decimDigits = parseInt(that.ctrl_decimdigits.getValue());
                        settings.minval = parseFloat(that.ctrl_minval.getValue());
                        settings.maxval = parseFloat(that.ctrl_maxval.getValue());
                        settings.connectLines = that.ctrl_connectLines.getValue();
                    }
                }

                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.propInfo.tableid;
                data.propid = that.propInfo.propid;
                data.name = that.ctrl_name.getValue();
                data.settings = JSON.stringify(settings);


                that.close();

                DQX.customRequest(MetaData.serverUrl,'uploadtracks','property_setinfo', data, function(resp) {
                    DQX.stopProcessing();
                    Msg.send({ type: 'ReloadChannelInfo' });
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                });

            }

            return that;
        }



        return EditProperty;
    });




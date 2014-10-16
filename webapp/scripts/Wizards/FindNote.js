// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var FindNote  = {};


        FindNote.execute = function() {



            var that = PopupFrame.PopupFrame('FindNote',
                {
                    title: 'Find note',
                    blocking: false,
                    sizeX:700, sizeY:500
                }
            );

            that.maxcount = 50;

            that.eventids = [];//Add event listener id's to this list to have them removed when the popup closes
            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid, { type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid) {
                    if (that.myTable)
                        that.myTable.render();
                }
            } );

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();

                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 120).setFrameClassClient('DQXGrayClient').setMargins(5);

                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7));
            };

            that.updateQuery = function() {
                DQX.customRequest(MetaData.serverUrl, PnServerModule, 'note_search',
                    {
                        database: MetaData.database,
                        workspaceid: MetaData.workspaceid,
                        maxcount: parseInt(that.maxcount+1),
                        searchtext: that.ctrl_searchString.getValue(),
                        tableid: that.ctrl_searchIn.getValue(),
                        sortby: that.ctrl_sortBy.getValue()
                    },
                    function (resp) {
                        DQX.stopProcessing();

                        var str = '';
                        for (var notenr = 0; notenr<resp.notes_id.length; notenr++) {
                            str += '<div class="PnItemNoteSearchResult" id="{id}">'.DQXformat({id: 'note__'+notenr});
                            var tableInfo = MetaData.mapTableCatalog[resp.notes_tableid[notenr]];

                            str += '<div style="position: absolute">'+tableInfo.createIcon({floatLeft: false})+'</div>';

                            str += '<div style="margin-left: 80px;vertical-align: top;">';

                            str += '<div class="PnItemHeaderText" style="position:absolute;right:10px;top:4px">' + resp.notes_timestamp[notenr]+' ';
                            str += resp.notes_userid[notenr]+'</div>';

                            str += '<div style="padding-bottom:7px;color:rgb(0,122,132)">{itemname}: <b>{itemid}</b></div>'.DQXformat({itemname: tableInfo.tableCapNameSingle, itemid: resp.notes_itemid[notenr]});


                            var notecontent =resp.notes_content[notenr];
                            notecontent = notecontent.replace(/(?:\r\n|\r|\n)/g, '<br />');
                            str += notecontent;
                            str += '</div>';

                            str += '</div>';
                        }

                        if (resp.notes_id.length==0) {
                            that.ctrl_comment.modifyValue('');

                            if (!that.ctrl_searchString.getValue())
                                str = 'There are currently no notes present. You can add a note to a data item by clicking on the "Notes" tab in a data item popup window';
                            else
                                str = 'The search string did not match any notes in the data set';

                            str = '<div class="SupportingText" style="padding: 20px">' + str +'</div>';
                        }
                        else {
                            if (resp.notes_id.length>that.maxcount)
                                that.ctrl_comment.modifyValue('Showing the first {count} notes found'.DQXformat({count: that.maxcount}));
                            else
                                that.ctrl_comment.modifyValue('{count} notes found'.DQXformat({count: resp.notes_id.length}));

                        }

                        that.frameBody.setContentHtml(str);

                        var contentdiv = $('#' + that.frameBody.getClientDivID());
                        contentdiv.find('.PnItemNoteSearchResult').click(function(ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            var notenr = parseInt($(this).attr('id').split('__')[1]);
                            Msg.send({ type: 'ItemPopup' }, { tableid: resp.notes_tableid[notenr], itemid: resp.notes_itemid[notenr] } );
                        });

                    });

            }

            that.createPanels = function() {

                that.ctrl_searchString = Controls.Edit(null,{ size: 25, value: '' }).setOnChanged(DQX.debounce(that.updateQuery,200)).setHasDefaultFocus();

                that.ctrl_sortBy = Controls.Combo(null,{label:'', value:'date', states: [{id:'date', name:'Most recent first'}, {id:'score', name:'Most relevant first'}]})
                    .setOnChanged(that.updateQuery);

                var states = [{id:'_all_', name:'All data items'}];
                $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                    if (!tableInfo.settings.DisableNotes)
                        states.push({id:tableInfo.id, name:tableInfo.tableCapNamePlural});
                });
                that.ctrl_searchIn = Controls.Combo(null,{label:'', value:'_all_', states: states})
                    .setOnChanged(function() {
                        that.checkShowQueryButton();
                        that.updateQuery();
                    });

                that.panelButtons = Framework.Form(that.frameButtons);

                var grd = Controls.CompoundGrid();
                grd.setItem(0, 0, Controls.Static('<b>Search for:</b>'));
                grd.setItem(0, 1, that.ctrl_searchString);
                grd.setItem(1, 0, Controls.Static('<b>Sort by:</b>'));
                grd.setItem(1, 1, that.ctrl_sortBy);

                grd.setItem(0, 2, Controls.Static('<b>Search in:</b>'));
                grd.setItem(0, 3, that.ctrl_searchIn);

                var bt = Controls.Button(null, {buttonClass: 'DQXToolButton2', content: 'Show as query'});
                that.showQuery = Controls.ShowHide(bt);
                that.showQuery.setVisible(false);
                bt.setOnChanged(that.createQuery);
                grd.setItem(0, 4, that.showQuery);


                that.panelButtons.addControl(grd);

                that.ctrl_comment = Controls.Html(null, '', 'PnItemNoteSearchComment');

                that.panelButtons.addControl(that.ctrl_comment);

                that.updateQuery();
                //that.frameBody.setContentHtml('dfkjgfkjfgjk');
            };

            that.checkShowQueryButton = function() {
                var tableid = that.ctrl_searchIn.getValue();
                that.showQuery.setVisible(tableid!='_all_');
            }


            that.createQuery = function() {
                var tableid = that.ctrl_searchIn.getValue();
                var tableInfo = MetaData.mapTableCatalog[tableid];
                var query = tableInfo.createNoteWhereclause(that.ctrl_searchString.getValue());
                Msg.send({type: 'DataItemTablePopup'}, {
                    tableid: tableInfo.id,
                    query: query,
                    subSamplingOptions: null,
                    title: tableInfo.tableCapNamePlural
                });
            }

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };

            that.create();
        }

        return FindNote;
    });


define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "Views/GenomeBrowser"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup,
              MetaData, GetFullDataItemInfo, MiscUtils, GenomeBrowser
        ) {

        var ItemGenomeTracksPopup = {};


        ItemGenomeTracksPopup.show = function(tableInfo, itemid) {
            var content = '';

            $.each(tableInfo.tableBasedSummaryValues, function(idx, summaryValue) {
                var bt = Controls.Button(null, { content: 'Show <b>' + summaryValue.trackname + '</b>', buttonClass: 'DQXToolButton2', width:200, height:30}).setOnChanged(function() {
                    if (!tableInfo.genomeTrackSelectionManager.isItemSelected(itemid))
                        tableInfo.genomeTrackSelectionManager.selectItem(itemid, true);
                    if (!tableInfo.mapTableBasedSummaryValues[summaryValue.trackid].isVisible) {
                        tableInfo.mapTableBasedSummaryValues[summaryValue.trackid].isVisible = true;
                        Application.getView('genomebrowser').rebuildTableBasedSummaryValues(tableInfo.id);
                    }
                    Application.activateView('genomebrowser');
                    Popup.closeIfNeeded(popupid);
                })
                content += '<br>' + bt.renderHtml();
            });


            var bt = Controls.Button(null, { content: 'Hide all', buttonClass: 'DQXToolButton2', width:200, height:30}).setOnChanged(function() {
                if (tableInfo.genomeTrackSelectionManager.isItemSelected(itemid))
                    tableInfo.genomeTrackSelectionManager.selectItem(itemid, false);
                Popup.closeIfNeeded(popupid);
            })

            content += '<p>' + bt.renderHtml();

            var popupid = Popup.create('Genome tracks', content);
        };

//                    var chk = Controls.Check(null, {
//                            label: 'Show Genome tracks',
//                            value:that.tableInfo.genomeTrackSelectionManager.isItemSelected(that.itemid)
//                        }).setOnChanged(function() {
//                        that.tableInfo.genomeTrackSelectionManager.selectItem(that.itemid,chk.getValue())
//                    })


        return ItemGenomeTracksPopup;
    });




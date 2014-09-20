// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var GenePopup = {};

        GenePopup.init = function() {
            Msg.listen('',{type:'GenePopup'}, function(scope,geneID) {
                GenePopup.show(geneID);
            });
        }

        GenePopup.show = function(geneID) {
            var myurl = DQX.Url(MetaData.serverUrl);
            myurl.addUrlQueryItem("datatype", 'recordinfo');
            myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed('fid', '=', geneID)));
            myurl.addUrlQueryItem("database", MetaData.database);
            myurl.addUrlQueryItem("tbname", MetaData.tableAnnotation);
            $.ajax({
                url: myurl.toString(),
                success: function (resp) {
                    DQX.stopProcessing();
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        alert(keylist.Error);
                        return;
                    }
                    GenePopup.show_sub1(keylist.Data);
                },
                error: DQX.createMessageFailFunction()
            });
            DQX.setProcessing("Downloading...");
        }


        GenePopup.show_sub1 = function(data) {
            var content='';
            content += '<div style="padding:5px">';
            content += '<div style="max-width:600px;line-height: 150%">';
            content += '<b>Id</b>: '+data.fid+'<br/>';
            content += '<b>Name</b>: '+data.fname+'<br/>';
            content += '<b>Alternatives</b>: '+data.fnames.split(',').join(', ')+'<br/>';
            content += '<b>Description</b>: '+data.descr+'<br/>';
            content += '<b>Position</b>: '+data.chromid+':'+data.fstart+'-'+data.fstop+'<br/>';
            content += '</div>';

            content +='<p>';

            var button_snps = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Show in genome browser', width:140, height:50, bitmap:'Bitmaps/GenomeBrowser.png' }).setOnChanged(function() {
                Msg.send({type: 'JumpgenomeRegion'}, { chromoID:data.chromid, start:parseInt(data.fstart), end:parseInt(data.fstop) });
                Popup.closeIfNeeded(popupid);
            });
            content += button_snps.renderHtml();

            $.each(MetaData.tableCatalog, function(idx, table) {
                if (table.hasGenomePositions) {
                    var button_snps = Controls.Button(null, {
                        buttonClass: 'DQXToolButton2',
                        content: '{name} in this gene'.DQXformat({name: table.tableCapNamePlural}),
                        width:140, height:50,
                        icon: table.settings.Icon?table.settings.Icon:'fa-table'
                    }).setOnChanged(function() {
                        Msg.send({type: 'ShowItemsInGenomeRange', tableid:table.id}, {
                            preservecurrentquery:false,
                            chrom:data.chromid,
                            start:data.fstart,
                            stop:data.fstop
                        });
                        Popup.closeIfNeeded(popupid);
                    });
                    content += button_snps.renderHtml();
                }
            });

            // Create buttons to show genomic regions spanning this position
            $.each(MetaData.tableCatalog, function(idx, oTableInfo) {
                if (oTableInfo.hasGenomeRegions) {
                    var bt = Controls.Button(null, {
                        content: 'Show '+oTableInfo.tableNamePlural,
                        buttonClass: 'DQXToolButton2',
                        width:150, height:50,
                        icon: oTableInfo.settings.Icon?oTableInfo.settings.Icon:'fa-table'
                    }).setOnChanged(function() {
                        var qry = SQL.WhereClause.AND([
                            SQL.WhereClause.CompareFixed(oTableInfo.settings.Chromosome, '=', data.chromid),
                            SQL.WhereClause.CompareFixed(oTableInfo.settings.RegionStart, '<=', data.fstop),
                            SQL.WhereClause.CompareFixed(oTableInfo.settings.RegionStop, '>=', data.fstart)
                        ]);
                        Msg.send({type: 'DataItemTablePopup'}, {
                            tableid: oTableInfo.id,
                            query: qry,
                            title: oTableInfo.tableCapNamePlural + ' in ' + data.chromid + ':' + data.fstart + '-' + data.fstop
                        });
                        Popup.closeIfNeeded(popupid);
                    })
                    content += bt.renderHtml();
                }
            });

            if (MetaData.generalSettings.ExternalGeneLinks) {
                var linkArray = JSON.parse(MetaData.generalSettings.ExternalGeneLinks);
                $.each(linkArray, function(idx, linkInfo) {
                    var bt = Controls.Button(null, { content: linkInfo.Name, buttonClass: 'DQXToolButton2', width:150, height:50, bitmap:"Bitmaps/circle_cyan_small.png"}).setOnChanged(function() {
                        Popup.closeIfNeeded(popupid);
                        var url = linkInfo.Url.DQXformat({Id: data.fid});
                        window.open(url,'_blank');
                    })
                    content += bt.renderHtml();
                });
            }




            content += '<br>';

            $.each(MetaData.externalLinks, function(idx, link) {
                if (link.linktype=='annotation_gene') {
                    var button_link = Controls.Button(null, { content: 'Find in '+link.linkname }).setOnChanged(function() {
                        window.open(link.linkurl.DQXformat({id:data.fid}), '_blank');
                    });
                    content += button_link.renderHtml();
                }
            });

            content += '</div>';
            var popupid = Popup.create('Gene',content);
        }


        return GenePopup;
    });




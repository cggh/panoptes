define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "Utils/QueryTool", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, QueryTool, MetaData) {

        var Genotypes = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'genotypes',    // View ID
                    'Genotypes'    // View title
                );
                that.setEarlyInitialisation();

                that.querySamples = QueryTool.Create('SMP', {includeCurrentQuery:true});
                that.queryVariants = QueryTool.Create('SNP', {includeCurrentQuery:true});


                that.querySamples.notifyQueryUpdated = function() {
                    alert('Samples query modified');
                };

                that.queryVariants.notifyQueryUpdated = function() {
                    alert('Variants query modified');
                };


                that.storeSettings = function() {
                    var obj= {};
                    obj.querySamples = that.querySamples.store();
                    obj.queryVariants = that.queryVariants.store();
                    return obj;
                };

                that.recallSettings = function(settObj) {
                    if (settObj.querySamples)
                        that.querySamples.recall(settObj.querySamples);
                    if (settObj.queryVariants)
                        that.queryVariants.recall(settObj.queryVariants);
                };


                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    that.filterByQuery = false;
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));//Create frame that will contain the controls panel
                    this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7));//Create frame that will contain the genome browser panel

                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);
                    this.panelControls.setPadding(10);

                    var ctrlQuerySamples = that.querySamples.createControl();
                    var ctrlQueryVariants = that.queryVariants.createControl();

                    this.panelControls.addControl(Controls.CompoundVert([
                        ctrlQuerySamples,
                        ctrlQueryVariants
                    ]));
                };




                return that;
            }

        };

        return Genotypes;
    });
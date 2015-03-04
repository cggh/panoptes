import os
import glob
import fnmatch, re
import datetime
import SimpleFilterBankData
import MultiCategoryDensityFilterBankData
import ImpUtils
import logging
from BaseImport import BaseImport
import config
import gzip
import shutil
import SettingsLoader
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import customresponders.panoptesserver.Utils as Utils

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ProcessFilterBank(BaseImport):

    #Keep the log messages so that they can be output in one go so that log is less confusing
    def _log(self, message):
        if self.isMPI():
            msg = '###' + self._logId + '###' + message
            if self._calculationObject.logfilename is not None:
                self._logFH.Write_shared(msg + '\n')
            else:
                super(ProcessFilterBank, self)._log(msg)
        else:
            super(ProcessFilterBank, self)._log(message)
            #self._logMessages.append(message)
        
    def printLog(self):
        if self.isMPI():
#            self._logFH.Write_shared(self._logId + self._calculationObject.logfilename + ' file closing\n')
            if self._calculationObject.logfilename is not None:
                self._logFH.Sync()
#This seems to hang/or take a loooonnnnggggg time
#            self._logFH.Close()
#        else:
#            msg = '###' + self._logId + '###'
#            logPrefix = '\n' + msg
#            super(ProcessFilterBank, self)._log(msg + logPrefix.join(self._logMessages))
        
    def _getImportSetting(self, name):
        ret = None
        if name in self._importSettings:
            ret = self._importSettings[name]
        else:
            if name == 'Process':
                ret = 'all'
        return ret
    
    def _createSummary(self, output, chromosome, pos_str, val_str):
        pos = int(pos_str)
        val = None
        try:
            val = float(val_str)
        except:
            pass
#   print 'chrom %s, pos %d, val %s' % (chromosome, pos, val)
        if chromosome != output["currentChromosome"]:                        
            summariser = SimpleFilterBankData.Summariser(chromosome, output["propId"], output["blockSizeStart"], output["blockSizeIncrFactor"], output["blockSizeMax"], output["outputDir"], output["maxval"], output["minval"])
            if output["summariser"] != None:
                output["summariser"].Finalise()
            else:
                self._log(str(summariser))
            output["summariser"] = summariser
            
            output["currentChromosome"] = chromosome
        output["summariser"].Add(pos,val)

    def _createSummaryValues_Categorical(self, output, chromosome, pos_str, val_str):
        pos = int(float(pos_str))
        val = val_str
#   print 'chrom %s, pos %d, val %s' % (chromosome, pos, val)
        if chromosome != output["currentChromosome"]:
            if output["summariser"] != None:
                output["summariser"].Finalise()
            output["summariser"] = MultiCategoryDensityFilterBankData.Summariser(chromosome, output["propId"], output["blockSizeStart"], output["blockSizeIncrFactor"], output["blockSizeMax"], output["outputDir"], output["Categories"])
            output["currentChromosome"] = chromosome
        output["summariser"].Add(pos,val)        
        
    def _isSimpleTask(self, task):
        return 'minval' in task
        
    def _extractColumnsAndProcess(self, banks, writeHeader, readHeader, writeColumnFiles, tableBased=False):
        
        
        sourceFileName = None
        
        if len(banks) == 0:
#            self._log('Nothing to filter bank')
            return
        
        for output in banks:
            if sourceFileName == None:
                sourceFileName = output["inputFile"]
            else:
                if sourceFileName != output["inputFile"]:
                    raise ValueError("input file names do not match:", sourceFileName, " vs ", output["inputFile"])
            if writeColumnFiles:
                if output["outputFile"] == None:
                    raise ValueError("No output file specified")
                self._log('Extracting columns {0} from {1} to {2}'.format(','.join(output["columns"]), sourceFileName, output["outputFile"]))
                self._log(output)
                #Changing the bufsiz seems to have little or no impact
                output["destFile"] = open(output["outputFile"], 'w')
                if writeHeader:
                    output["destFile"].write('\t'.join(output["columns"]) + '\n')
                            
        linecount = 0
        if sourceFileName.endswith('gz'):
            sourceFile = gzip.open(sourceFileName)
        else:
            sourceFile = open(sourceFileName, 'r')
            
        with self._logHeader('Creating summary values from {}'.format(sourceFileName)):
            with sourceFile:
                if readHeader:
                    header = sourceFile.readline().rstrip('\r\n').split('\t')
                    self._log('Original header: {0}'.format(','.join(header)))
                    header = [colname.replace(' ', '_') for colname in header]
                    self._log('Working Header : {0}'.format(','.join(header)))
                for output in banks:
                    output["currentChromosome"] = ''
                    output["summariser"] = None
                    output["colindices"] = []
                    if not self._isSimpleTask(output):
                        self._log("Categories:" + str(output["Categories"]))
                    if output["columns"] != None:
                        for col in output["columns"]:
                            try:
                                output["colindices"].append(header.index(col))
                            except ValueError:
                                raise Exception('Unable to find column {0} in file {1}'.format(col, sourceFileName))
                    else:
                        #Assume Chrom Pos Value
                        output["colindices"] = [0,1,2]
                                                
                if self._importSettings['ConfigOnly'] or (tableBased and self._importSettings['SkipTableTracks']=='true'):
                    self._log('Skipping filterbank execution')
                    return
                
                self._log('Executing filter bank')
                       
                currentChromosome = ''
                processedChromosomes = {}
                for line in sourceFile:
                    if linecount % 50000 == 0:
                        self._log(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + ' ' + str(linecount))
                    if self._maxLineCount > 0 and linecount > self._maxLineCount:
                        self._log('Processing halted at {} lines'.format(str(linecount)))
                        break
                    linecount += 1
                    line = line.rstrip('\r\n')
                    if len(line) > 0:
                        columns = line.split('\t')
                        fields = [columns[colindex] for colindex in banks[0]["colindices"]]
                        chromosome = fields[0]
                        if chromosome != currentChromosome:
                            self._log('##### Start processing chromosome '+chromosome)
                            if chromosome in processedChromosomes:
                                raise Exception('File should be ordered by chromosome')
                            processedChromosomes[chromosome] = True
                            currentChromosome = chromosome
                        for output in banks:
                            fields = [columns[colindex] for colindex in output["colindices"]]
                            if self._isSimpleTask(output):
                                self._createSummary(output, fields[0], fields[1], fields[2])
                            else:
                                self._createSummaryValues_Categorical(output, fields[0], fields[1], fields[2])
                            if writeColumnFiles:
                                outline = '\t'.join(fields)
                                output["destFile"].write(outline + '\n')
    
    
            #self._log('Finished processing {}. {} lines'.format(sourceFileName,str(linecount)))
            for output in banks:
                if output["summariser"] != None:
                    output["summariser"].Finalise()
                if writeColumnFiles:
                    output["destFile"].close()


    def _replaceSummaryValuesDB(self, tableid, propid, name, summSettings, minVal):
        sourceid = 'fixed'
        workspaceid = self._workspaceId
        extraSummSettings = summSettings.Clone()
        extraSummSettings.DropTokens(['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
        #Don't know why here when createSummaryValues has already deleted all
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            stmt = "DELETE FROM summaryvalues WHERE (propid='{0}') and (tableid='{1}') and (source='{2}') and (workspaceid='{3}')"
            sql = stmt.format(propid, tableid, sourceid, workspaceid)
            self._execSql(sql)
            stmt = "INSERT INTO summaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', {7}, {8}, {9})"
            sql = stmt.format(workspaceid,
                              sourceid,
                              propid,
                              tableid,
                              name,
                              -1,
                              extraSummSettings.ToJSON(),
                              minVal,
                              summSettings['MaxVal'],
                              summSettings['BlockSizeMin']
                              )
            self._execSql(sql)




    def _getTrackDest(self, propid):
        global config
        destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, propid)
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        dataFileName = os.path.join(destFolder, propid)
        return destFolder, dataFileName
                    

    def _prepareSummaryValues(self, tableid):
        
        import DQXDbTools
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'summaryvalues'))

        #See also _replaceSummaryValuesDB
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            sql = "DELETE FROM summaryvalues WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
        
        settings, sourceFileName = self._getDataFiles(tableid)
        
        #self._log(("Preparing to create summary values for {} from {} using {}").format(tableid, sourceFileName, settings))
        tableSettings, properties = self._fetchSettings(tableid)

        outputs = []
        outputc = []
        for prop in properties:
            propid = prop['propid']
            settings = prop['Settings']
            if settings.HasToken('SummaryValues') and ImpUtils.IsValueDataTypeIdenfifier(prop['DataType']):
#                with calculationObject.LogHeader('Creating summary values for {0}.{1}'.format(tableid,propid)):
                    #self._log('Creating summary values for {0}.{1}'.format(tableid,propid))
                    summSettings = settings.GetSubSettings('SummaryValues')
                    if settings.HasToken('minval'):
                        summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                    summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                    summSettings.RequireTokens(['BlockSizeMax'])
                    summSettings.AddTokenIfMissing('MinVal', 0)
                    summSettings.AddTokenIfMissing('BlockSizeMin', 1)
                    summSettings.DefineKnownTokens(['channelColor'])
    
                    self._replaceSummaryValuesDB(tableid, propid, settings['Name'], summSettings,summSettings["MinVal"])
                    destFolder, dataFileName = self._getTrackDest(propid)
                    
                    values = { 
                          'outputDir': destFolder, 
                          'outputFile' : dataFileName, 
                          'columns': [tableSettings['Chromosome'], tableSettings['Position'], propid] , 
                          'propId': propid,
                          'minval': float(summSettings["MinVal"]),
                          'maxval': float(summSettings["MaxVal"]),
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'inputFile': sourceFileName

                          }
                    outputs.append(values)
                    
            if (settings.HasToken('SummaryValues')) and (prop['DataType'] == 'Text'):
#                with calculationObject.LogHeader('Creating categorical summary values for {0}.{1}'.format(tableid,propid)):
                    #self._log('Creating categorical summary values for {0}.{1}'.format(tableid,propid))
                    summSettings = settings.GetSubSettings('SummaryValues')
                    summSettings.RequireTokens(['BlockSizeMin', 'BlockSizeMax'])
                    summSettings.AddTokenIfMissing('MaxVal', 1.0)
                    
                    destFolder, dataFileName = self._getTrackDest(propid)
                    categories = []
                    if settings.HasToken('categoryColors'):
                        stt = settings.GetSubSettings('categoryColors')
                        categories = [x for x in stt.Get()]
                        summSettings.AddTokenIfMissing('Categories', categories)
                    self._replaceSummaryValuesDB(tableid, propid, settings['Name'], summSettings,0)
                    cval = {                            
                          'outputDir': destFolder, 
                          'outputFile' : dataFileName, 
                          'columns': [tableSettings['Chromosome'], tableSettings['Position'], propid] , 
                          'propId': propid,
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'Categories': summSettings['Categories'],
                          'inputFile': sourceFileName
                            }
                    outputc.append(cval)
            
        return outputs,outputc
        

    def createSummaryValues(self, tableid):
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'files':
            outputs, outputc = self._prepareSummaryValues(tableid)
            self._extractColumnsAndProcess(outputs + outputc, False, True, True)
        
    def _prepareSummaryFilterBank(self, tableid, summSettings, summaryid):
        global config
        
        outputs = []
        if self._getImportSetting('ScopeStr') == 'all':
            itemtracknr = 0
            
            parentdir = os.path.join(self._datatablesFolder, tableid, summaryid)
            cols = None
            files = None
            readHeader = False
            copyFile = True
            reobj = None
            if (os.path.isdir(parentdir)):
                files = os.listdir(parentdir)
            else:
                readHeader = True
                copyFile = False
                cols = ['chrom', 'pos', summaryid]
                pattern = os.path.join(self._datatablesFolder, tableid) + os.sep + summSettings["FilePattern"]
                files = glob.glob(pattern)
                #Replace the .* with (.*) so we can pick it out to use as the id
                regex = fnmatch.translate(pattern).replace('.*','(.*)')
                #self._log('Using {}'.format(regex))
                reobj = re.compile(regex)
            for fileName in files:
                if reobj is not None:
                    m = reobj.match(fileName)
                    fileid = m.group(1)
                else:
                    fileid = fileName
                    fileName = os.path.join(parentdir, fileid)
                if not (os.path.isdir(fileName)):
                    itemtracknr += 1
                    #self._log('Processing {0}: {1}'.format(itemtracknr, fileid))
                    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, 'TableTracks', tableid, summaryid, fileid)
                    #self._log('Destination: ' + destFolder)
                    if not os.path.exists(destFolder):
                        os.makedirs(destFolder)
                    if copyFile:
                        shutil.copyfile(fileName, os.path.join(destFolder, summaryid + '_' + fileid))
                    values = { 
                          'outputDir': destFolder, 
                          'outputFile' : None, 
                          'columns': cols , 
                          'propId': summaryid + '_' + fileid,
                          'minval': float(summSettings["MinVal"]),
                          'maxval': float(summSettings["MaxVal"]),
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'readHeader': readHeader,
                          'inputFile': fileName
                    }
                    outputs.append(values)
                    
            return outputs          
            
    def _prepareTableBasedSummaryValues(self, tableid):
           
        tableSettings, properties = self._fetchSettings(tableid, includeProperties = False)
           
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            sql = "DELETE FROM tablebasedsummaryvalues WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            
        output = []
        if tableSettings.HasToken('TableBasedSummaryValues'):
            #self._log('Processing table-based summary values')
            if not type(tableSettings['TableBasedSummaryValues']) is list:
                raise Exception('TableBasedSummaryValues token should be a list')
            for stt in tableSettings['TableBasedSummaryValues']:
                summSettings = SettingsLoader.SettingsLoader()
                summSettings.LoadDict(stt)
                summSettings.AddTokenIfMissing('MinVal', 0)
                summSettings.AddTokenIfMissing('BlockSizeMin', 1)
                summSettings.DefineKnownTokens(['channelColor'])
                summaryid = summSettings['Id']
                #with self._logHeader('Table based summary value {0}, {1}'.format(tableid, summaryid)):
                extraSummSettings = summSettings.Clone()
                extraSummSettings.DropTokens(['Id', 'Name', 'MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
                if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
                    stmt = "INSERT INTO tablebasedsummaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', {4}, {5}, {6}, 0)"
                    sql = stmt.format(tableid,
                                     summaryid, 
                                     summSettings['Name'], 
                                     extraSummSettings.ToJSON(), 
                                     summSettings['MinVal'], 
                                     summSettings['MaxVal'], 
                                     summSettings['BlockSizeMin'])
                    self._execSql(sql)
                if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'files':
                    outputs = self._prepareSummaryFilterBank(tableid, summSettings, summaryid)
                    output = output + outputs
                        
        return output



    def createTableBasedSummaryValues(self, tableid):
        
        output = self._prepareTableBasedSummaryValues(tableid)
        readHeader = True
        for out in output:
            if 'readHeader' in out:
                readHeader = out['readHeader']
            else:
                readHeader = True
            outputa = [ out ]
            self._extractColumnsAndProcess(outputa, False, readHeader, False, tableBased=True)

     
    def createCustomSummaryValues(self, sourceid, tableid):
    
        settings, properties = self._fetchCustomSettings(sourceid, tableid)
        
        tables = self._getTablesInfo(tableid)
        tableSettings = tables[0]["settings"]
        
        isPositionOnGenome = False
        if tableSettings.HasToken('IsPositionOnGenome') and tableSettings['IsPositionOnGenome']:
            isPositionOnGenome = True
            chromField = tableSettings['Chromosome']
            posField = tableSettings['Position']
                
        self._log('Creating custom summary values')
        for prop in properties:
            propid = prop['propid']
            settings = prop['Settings']
            if settings.HasToken('SummaryValues'):
                with self._logHeader('Creating summary values for custom data {0}'.format(tableid)):
                    summSettings = settings.GetSubSettings('SummaryValues')
                    if settings.HasToken('minval'):
                        summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                    summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, propid)
                    if not os.path.exists(destFolder):
                        os.makedirs(destFolder)
                    dataFileName = os.path.join(destFolder, propid)

                    if not isPositionOnGenome:
                        raise Exception('Summary values defined for non-position table')

                    if not self._importSettings['ConfigOnly']:
                        self._log('Extracting data to '+dataFileName)
                        script = ImpUtils.SQLScript(self._calculationObject)
                        script.AddCommand("SELECT {2} as chrom, {3} as pos, {0} FROM {1} ORDER BY {2},{3}".format(
                            DBCOLESC(propid),
                            DBTBESC(Utils.GetTableWorkspaceView(self._workspaceId, tableid)),
                            DBCOLESC(chromField),
                            DBCOLESC(posField)
                        ))
                        script.Execute(self._datasetId, dataFileName)
                        self._calculationObject.LogFileTop(dataFileName, 5)

                    ImpUtils.CreateSummaryValues_Value(
                        self._calculationObject,
                        summSettings,
                        self._datasetId,
                        tableid,
                        'custom',
                        self._workspaceId,
                        propid,
                        settings['Name'],
                        dataFileName,
                        self._importSettings
                    )
                            
               
               
    #Not actually used except below
    def createAllSummaryValues(self):
        self._log('Creating summary values')
        
        datatables = self._getGlobalSettingList('DataTables')
        
        datatables = self._getDatasetFolders(datatables)
                
        for datatable in datatables:
            self.createSummaryValues(datatable)
            self.createTableBasedSummaryValues(datatable)

    def enum(self, *sequential, **named):
        """Handy way to fake an enumerated type in Python
        http://stackoverflow.com/questions/36932/how-can-i-represent-an-enum-in-python
        """
        enums = dict(zip(sequential, range(len(sequential))), **named)
        return type('Enum', (), enums)

    #Not actually used except below
    def createAllSummaryValuesMPI(self):
        # Define MPI message tags
        tags = self.enum('READY', 'DONE', 'EXIT', 'START')

        # Initializations and preliminaries
        comm = MPI.COMM_WORLD   # get MPI communicator object
        size = comm.size        # total number of processes
        rank = comm.rank        # rank of this process
        status = MPI.Status()   # get MPI status object

        self._logId = 'PFB: '+ str(rank)
        if rank == 0:
            # Master process executes code below
            #self._log('Creating summary values')
            num_workers = size - 1
            closed_workers = 0
            errors = False
            try:
                with self._logHeader("Master starting with %d workers" % (num_workers)):
        
                    datatables = self._getGlobalSettingList('DataTables')
        
                    datatables = self._getDatasetFolders(datatables)
            
                    tasks = []    
                    for tableid in datatables:
                        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'files':
                            outputs, outputc = self._prepareSummaryValues(tableid)
                            tasks = tasks + outputs + outputc
                            outputs = self._prepareTableBasedSummaryValues(tableid)
                            tasks = tasks + outputs

                    task_index = 0
                    self._log("%d tasks" % (len(tasks)))
                    while closed_workers < num_workers:
                        data = comm.recv(source=MPI.ANY_SOURCE, tag=MPI.ANY_TAG, status=status)
                        source = status.Get_source()
                        tag = status.Get_tag()
                        if tag == tags.READY:
                        # Worker is ready, so send it a task
                            if task_index < len(tasks):
                                task = tasks[task_index]
                                comm.send(task, dest=source, tag=tags.START)
                                #self._log("Sending task %d to worker %d, %s" % (task_index, source, task))
                                task_index += 1
                            else:
                                comm.send(None, dest=source, tag=tags.EXIT)
                        elif tag == tags.DONE:
                            results = data
                            if results != 0:
                                self._log("Error from worker %d" % source)
                                errors = True
                                #Need to close workers gracefully
                                comm.send(None, dest=source, tag=tags.EXIT)
                                raise Exception('Error in processing task')
                        elif tag == tags.EXIT:
                            #self._log("Worker %d exited." % source)
                            closed_workers += 1
            except:
                e = sys.exc_info()[0]
                self._log("Failed Master on %s." % (MPI.Get_processor_name()))
                errors = True
                self._logger.exception(e)
                while closed_workers < num_workers:
                    data = comm.recv(source=MPI.ANY_SOURCE, tag=MPI.ANY_TAG, status=status)
                    source = status.Get_source()
                    tag = status.Get_tag()
                    if tag == tags.READY:
                        comm.send(None, dest=source, tag=tags.EXIT)
                    elif tag == tags.EXIT:
                        #self._log("Worker %d exited." % source)
                        closed_workers += 1
            finally:
                if errors:
                    self._log("There were errors in the run - please check the log")
                #self._log("Master finishing")
                self.printLog()
        else:
            # Worker processes execute code below
            name = MPI.Get_processor_name()
            self._log("I am a worker with rank %d on %s." % (rank, name))
            writeHeader = False
            readHeader = True
            writeColumnFiles = False
            while True:
                comm.send(None, dest=0, tag=tags.READY)
                
                task = comm.recv(tag=MPI.ANY_TAG, status=status)
                tag = status.Get_tag()
                
                if tag == tags.START:
                    taska = [ task ]
                    result = 0
                    ptype = ''
                    if 'readHeader' in task:
                        readHeader = task['readHeader']
                    else:
                        readHeader = True
                    try:
                        if self._isSimpleTask(task):
                            ptype = 'simple'
                        else:
                            ptype = 'categorical'
                        self._extractColumnsAndProcess(taska, writeHeader, readHeader, writeColumnFiles)
                        #self._log("Worker with rank %d on %s %s processing %s." % (rank, name, ptype, task))
                    except:
                        e = sys.exc_info()[0]
                        self._log("Failed Worker with rank %d on %s %s processing %s." % (rank, name, ptype, task))
                        self._logger.exception(e)
                        result = 1
                    finally:
                        comm.send(result, dest=0, tag=tags.DONE)
                elif tag == tags.EXIT:
                    break

            self._log("Finished Worker with rank %d on %s." % (rank, name))
            comm.send(None, dest=0, tag=tags.EXIT)



if __name__ == "__main__":
    
    import sys
    import customresponders.panoptesserver.asyncresponder as asyncresponder

    scopeOptions = ["all", "none", "1k", "10k", "100k"]

    processOptions = ["all", "db", "files"]
    
    if len(sys.argv) < 4:
        print('Arguments: ImportType processOptions DataSetId [mpi]')
        print('ImportType: '+', '.join(scopeOptions))
        print('processOptions: '+', '.join(processOptions))
        sys.exit()

    ImportMethod = sys.argv[1]
    if ImportMethod not in scopeOptions:
        print('Second argument (ImportType) has to be '+', '.join(scopeOptions))
        sys.exit()
    configOnly = (ImportMethod == 'none')

    processType = sys.argv[2]
    if processType not in processOptions:
        print('Second argument (processOptions) has to be '+', '.join(processOptions))
        sys.exit()
    

    datasetid = sys.argv[3]

    print('Start importing dataset "{0}"...'.format(datasetid))

    importSettings = {
                'ConfigOnly': configOnly,
                'ScopeStr': ImportMethod,
                'Process': processType
            }
        
    workspaceId = None
    
    if len(sys.argv) > 4 and sys.argv[4] == 'mpi':
         calc = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')
         #calc.logfilename = os.path.join(os.getcwd(),'filterbank.log')
         filterBanker = ProcessFilterBank(calc, datasetid, importSettings, workspaceId)
         #Need to install openmpi in order to use this option
         #
         #Optional import - note not in REQUIREMENTS
         #export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib/openmpi/
         #export CC=/usr/local/bin/mpicc
         #pip install mpi4py
         from mpi4py import MPI
         #Without Sun Grid Engine
         #It's better to install from source as the packaged version is old - recommend 1.8.1 - see below
         #mpiexec --prefix /usr/local -n 4 -host oscar,november python demo.py
         #With Sun Grid Engine
         #Need to install from source to get sge support
         #wget https://www.open-mpi.org/software/ompi/v1.8/downloads/openmpi-1.8.1.tar.gz
         #apt-get install libnuma-dev libtorque2-dev
         #./configure --with-sge
         #make
         #make install
         #qsub -cwd -S /bin/bash -pe mpi_pe 2 runq.sh
         #You can export OPAL_PREFIX=/usr/local instead of --prefix if that suits you better
         filterBanker.setMPI(True)
         filterBanker.createAllSummaryValuesMPI()
 
    else:
         calc = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')
         filterBanker = ProcessFilterBank(calc, datasetid, importSettings, workspaceId)
         filterBanker.createAllSummaryValues()

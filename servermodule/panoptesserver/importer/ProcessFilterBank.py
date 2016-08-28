import os
import glob
import fnmatch, re
import datetime
import SimpleFilterBankData
import MultiCategoryDensityFilterBankData
import ImpUtils
import logging
from BaseImport import BaseImport
import gzip
import shutil

from SettingsDataTable import SettingsDataTable

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
            summariser = MultiCategoryDensityFilterBankData.Summariser(chromosome, output["propId"], output["blockSizeStart"], output["blockSizeIncrFactor"], output["blockSizeMax"], output["outputDir"], output["Categories"])
            if output["summariser"] != None:
                output["summariser"].Finalise()
            else:
                self._log("Categorical summarizer:" + str(summariser))
            output["summariser"] = summariser
            output["currentChromosome"] = chromosome
        output["summariser"].Add(pos,val)        
        
    def _isSimpleTask(self, task):
        return not 'Categories' in task
        
    def _extractColumnsAndProcess(self, banks, writeHeader, readHeader, writeColumnFiles):
                            
        sourceFileName = None
        useDB = False
        
        if len(banks) == 0:
#            self._log('Nothing to filter bank')
            return
        
        for output in banks:
            if sourceFileName == None:
                sourceFileName = output["inputFile"]
                useDB = output["useDB"]
                columns = output["columns"]
            else:
                if sourceFileName != output["inputFile"]:
                    raise ValueError("input file names do not match:", sourceFileName, " vs ", output["inputFile"])
                if useDB != output["useDB"]:
                    raise ValueError("use of database does not match")
                if useDB and columns != output["columns"]:
                    raise ValueError("columns do not match using database")

            if writeColumnFiles:
                if output["outputFile"] == None:
                    raise ValueError("No output file specified")
                self._log('Extracting columns {0} from {1} to {2}'.format(','.join(output["columns"]), sourceFileName, output["outputFile"]))
                #Changing the bufsiz seems to have little or no impact
                output["destFile"] = open(output["outputFile"], 'w')
                if writeHeader:
                    output["destFile"].write('\t'.join(output["columns"]) + '\n')
                            
        linecount = 0
        if useDB:
            query = "SELECT {0} as chrom, {1} as pos, {2} FROM {3} ORDER BY {0},{1}".format(columns[0], columns[1], columns[2], sourceFileName)
            self._log('Extracting values for filter bank:' + query)
        else:
            if sourceFileName.endswith('gz'):
                sourceFile = gzip.open(sourceFileName)
            else:
                sourceFile = open(sourceFileName, 'r')
            
        with self._logHeader('Creating summary values from {}'.format(sourceFileName)):
            for output in banks:
                output["currentChromosome"] = ''
                output["summariser"] = None
                if not self._isSimpleTask(output):
                    self._log("Categories:" + str(output["Categories"]))
            
            if useDB:
                source = self._dao.getDBCursor()
            else:
                source = sourceFile
                            
            with source:
                    
                if readHeader:
                    header = sourceFile.readline().rstrip('\r\n').split('\t')
                    self._log('Original header: {0}'.format(','.join(header)))
                    header = [colname.replace(' ', '_') for colname in header]
                    self._log('Working Header : {0}'.format(','.join(header)))
                    for output in banks:
                        output["colindices"] = []
                        if output["columns"] != None:
                            for col in output["columns"]:
                                try:
                                    output["colindices"].append(header.index(col))
                                except ValueError:
                                    raise Exception('Unable to find column {0} in file {1}'.format(col, sourceFileName))
                else:
                    #Assume Chrom Pos Value
                    output["colindices"] = [0,1,2]
                self._log("colindices:" + str(output["colindices"]))
                
                #Do this here so config is checked           
                if self._importSettings['ConfigOnly'] or self._getImportSetting('Process') == 'db' or self._importSettings['SkipTableTracks']=='true':
                    self._log('Skipping filterbank execution')
                    return
                
                self._log('Executing filter bank')
                       
                currentChromosome = ''
                processedChromosomes = {}
                if useDB:
                    cur = source.execute(query)
                    
                for line in source if not useDB else source.cursor:
                    if linecount % 50000 == 0:
                        self._log(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + ' ' + str(linecount))
                    if self._maxLineCount > 0 and linecount > self._maxLineCount:
                        self._log('Processing halted at {} lines'.format(str(linecount)))
                        break
                    linecount += 1
                    if not useDB:
                        line = line.rstrip('\r\n')
                    if len(line) > 0:
                        if useDB:
                            columns = list(line)
                            #Need to cast to an int because it's a double in the db
                            columns[1] = int(line[1])
                        else:
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

    def _getTrackDest(self, propid):
        destFolder = os.path.join(self._config.getBaseDir(), 'SummaryTracks', self._datasetId, propid)
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        dataFileName = os.path.join(destFolder, propid)
        return destFolder, dataFileName
                    


    def _defineSettings(self, tableid, tableSettings, propid, sourceFileName, columns, sourceid = 'fixed', useDB = False):
        
        settings = tableSettings.getProperty(propid)
        summSettings = tableSettings.getPropertyValue(propid,'summaryValues')

        destFolder, dataFileName = self._getTrackDest(propid)
        values = {
            'outputDir':destFolder, 
            'outputFile':dataFileName, 
            'columns': columns, 
            'propId':propid, 
            'blockSizeIncrFactor':int(2), 
            'blockSizeStart':int(summSettings["blockSizeMin"]),
            'blockSizeMax':int(summSettings["blockSizeMax"]),
            'inputFile':sourceFileName,
            'useDB': useDB}
        updateDb = True
        
        
        if tableSettings.getPropertyValue(propid, 'isCategorical'): #                with calculationObject.LogHeader('Creating categorical summary values for {0}.{1}'.format(tableid,propid)):
            self._log('Creating categorical summary values for {0}.{1}'.format(tableid,propid))
            values.update({'Categories': tableSettings.getPropertyValue(propid,'categories')})
        elif settings['dataType'] in ['Float', 'Double', 'Int8', 'Int16', 'Int32']:
    #                with calculationObject.LogHeader('Creating summary values for {0}.{1}'.format(tableid,propid)):
            self._log('Creating summary values for {0}.{1}'.format(tableid,propid))
            values.update({'minval':float(tableSettings.getPropertyValue(propid,"minVal")), 'maxval':float(tableSettings.getPropertyValue(propid,"maxVal"))})
        else:
            updateDb = False
            self._log("Not creating summary values for:" + settings["name"] + str(settings))
        
        return None

    def _preparePropertiesBasedSummaryValues(self, sourceFileName, tableid, tableSettings):
        outputs = []
        
        for propid in tableSettings.getPropertyNames():
            
            if not tableSettings.getPropertyValue(propid,'summaryValues'):
                continue
            
            values = self._defineSettings(tableid, tableSettings, propid, sourceFileName, [tableSettings['chromosome'], tableSettings['position'], propid])
            if values != None:
                outputs.append(values)
                
        return outputs
    

 

    def _prepareSummaryValues(self, tableid):
        settings, sourceFileName = self._getDataFiles(tableid)
        
        #self._log(("Preparing to create summary values for {} from {} using {}").format(tableid, sourceFileName, settings))
        tableSettings = self._fetchSettings(tableid)

        outputs = self._preparePropertiesBasedSummaryValues(sourceFileName, tableid, tableSettings)
                        
        return outputs
        

    def createSummaryValues(self, tableid):
        
        outputs = self._prepareSummaryValues(tableid)
        self._extractColumnsAndProcess(outputs, False, True, True)
        
    def _prepareSummaryFilterBank(self, tableid, tableSettings, summaryid):
        
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
                pattern = os.path.join(self._datatablesFolder, tableid) + os.sep + tableSettings.getTableBasedSummaryValue(summaryid)["filePattern"]
                files = glob.glob(pattern)
                #Replace the .* with (.*) so we can pick it out to use as the id
                regex = fnmatch.translate(pattern).replace('.*','(.*)')
                #self._log('Using {}'.format(regex))
                reobj = re.compile(regex)
                if len(files) == 0:
                    self._log("No matches for pattern:" + pattern)
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
                    destFolder = os.path.join(self._config.getBaseDir(), 'SummaryTracks', self._datasetId, 'TableTracks', tableid, summaryid, fileid)
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
                          'minval': float(tableSettings.getTableBasedSummaryValue(summaryid)["minVal"]),
                          'maxval': float(tableSettings.getTableBasedSummaryValue(summaryid)["maxVal"]),
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(tableSettings.getTableBasedSummaryValue(summaryid)["blockSizeMin"]),
                          'blockSizeMax': int(tableSettings.getTableBasedSummaryValue(summaryid)["blockSizeMax"]),
                          'readHeader': readHeader,
                          'inputFile': fileName,
                          'useDB': False
                    }
                    outputs.append(values)
                    
        return outputs
            

    def _prepareTableBasedSummaryValues(self, tableid):
           
        tableSettings = self._fetchSettings(tableid)

        output = []
        if tableSettings['tableBasedSummaryValues']:
            #self._log('Processing table-based summary values')
            if not type(tableSettings['tableBasedSummaryValues']) is list:
                raise Exception('TableBasedSummaryValues token should be a list')
            for stt in tableSettings['tableBasedSummaryValues']:
                summaryid = stt['id']
                #with self._logHeader('Table based summary value {0}, {1}'.format(tableid, summaryid)):
                
                outputs = self._prepareSummaryFilterBank(tableid, tableSettings, summaryid)
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
            self._extractColumnsAndProcess(outputa, False, readHeader, False)

    def _getRefGenomeSummaryFolders(self):
        summaryids = []
        
        folder = os.path.join(self._datasetFolder, 'refgenome')
        summaryValuesFolder = os.path.join(folder, 'summaryvalues')
        if not os.path.exists(summaryValuesFolder):
            return
    
        for dir in os.listdir(summaryValuesFolder):
            item = os.path.join(summaryValuesFolder, dir)
            if os.path.isdir(item):
                summaryids.append(item)

        return summaryids
        
        
    def _prepareRefGenomeSummaryValues(self, summaryFolder):
        
        outputs = []
        
        tableid = '-'
        summaryid = os.path.basename(summaryFolder)
        with self._logHeader('Importing reference genome summary data '+summaryid):
            settings = SettingsDataTable()
            settings.loadFile(os.path.join(summaryFolder, 'settings'))
            output = self._preparePropertiesBasedSummaryValues(os.path.join(summaryFolder, 'data'), tableid, settings)
            outputs = outputs + output
        return outputs
         
    def createRefGenomeSummaryValues(self):

        summaryids = self._getRefGenomeSummaryFolders()
                
        if not summaryids is None:
            for summaryid in summaryids:
                outputs = self._prepareRefGenomeSummaryValues(summaryid)
                self._extractColumnsAndProcess(outputs, False, readHeader = True, writeColumnFiles = False)
            
    #Not actually used except below
    def createAllSummaryValues(self):
        self._log('Creating summary values')
        
        datatables = self._getGlobalSettingList('dataTables')
        
        datatables = self._getDatasetFolders(datatables)
                
        for datatable in datatables:
            self.createSummaryValues(datatable)
            self.createTableBasedSummaryValues(datatable)

        self.createRefGenomeSummaryValues()
        
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
                        outputs = self._prepareSummaryValues(tableid)
                        tasks = tasks + outputs
                        outputs = self._prepareTableBasedSummaryValues(tableid)
                        tasks = tasks + outputs

                    summaryids = self._getRefGenomeSummaryFolders()
                
                    for summaryid in summaryids:
                        outputs = self._prepareRefGenomeSummaryValues(summaryid)
                        print(str(outputs))
                        for out in outputs:
                            out['readHeader'] = True
                            tasks.append(out)
                    
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
        
    if len(sys.argv) > 4 and sys.argv[4] == 'mpi':
         calc = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')
         #calc.logfilename = os.path.join(os.getcwd(),'filterbank.log')
         filterBanker = ProcessFilterBank(calc, datasetid, importSettings)
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
         filterBanker = ProcessFilterBank(calc, datasetid, importSettings)
         filterBanker.createAllSummaryValues()

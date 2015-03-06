# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import sys
import time
import ImpUtils
import datetime
import dateutil.parser
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import DBDBESC
from DQXDbTools import DBCursor
import logging
import warnings
import threading
import MySQLdb

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class LoadTable(threading.Thread):
    
    def __init__(self, responder, sourceFileName, datasetId, tableId, columns, loadSettings, importSettings, createSubsets = False, allowSubSampling = None):
        
        threading.Thread.__init__(self)
        
        self.status = None
        
        self._responder = responder
        self._logMessages = []
        
        self._sourceFileName = sourceFileName
        self._datasetId = datasetId
        self._tableId = tableId
        self._separator = '\t'
        self._lineSeparator = '\n'
        #Whether to use a temporary file and INSERT or LOAD FILE
        self._bulkLoad = True
        self._createSubsets = createSubsets
        
        self._colNameList = [col['name'] for col in columns]
        self._primkey = loadSettings['PrimKey']
        self._autoPrimKey = (self._primkey == 'AutoKey')
        logger.debug('Column info: ' + str(columns))
        logger.debug('Primary key: ' + self._primkey)
    
        for col in columns:
            col['IsString'] = (col['DataType'] == 'Text')
            col['IsValue'] = ImpUtils.IsValueDataTypeIdenfifier(col['DataType'])
            col['IsDate'] = ImpUtils.IsDateDataTypeIdenfifier(col['DataType'])
            col['IsBoolean'] = (col['DataType'] == 'Boolean')
            
        self._columns = columns
        
        self._maxLineCount = -1
        if importSettings['ScopeStr'] == '1k':
            self._maxLineCount = 1000
        if importSettings['ScopeStr'] == '10k':
            self._maxLineCount = 10000
        if importSettings['ScopeStr'] == '100k':
            self._maxLineCount = 100000
        if importSettings['ScopeStr'] == '1M':
            self._maxLineCount = 1000000
        if importSettings['ScopeStr'] == '10M':
            self._maxLineCount = 10000000
            
        self._blockSize = 499
        self._blockStarted = False
        self._blockNr = 0
            
        #Defaults in case loadSettings is a dict
        self._columnDataTable = None
        self._allowSubSampling = allowSubSampling
        self._isPositionOnGenome = False
        self._rowDataTable = None
          
        if type(loadSettings) is dict:
            return
        
        loadSettings.AddTokenIfMissing('AllowSubSampling', False)
        if allowSubSampling == None:
            self._allowSubSampling = loadSettings['AllowSubSampling']
      
        if  loadSettings.HasToken('IsPositionOnGenome') and loadSettings['IsPositionOnGenome']:
            self._isPositionOnGenome = True
         
            if not loadSettings.HasToken('Chromosome'):
                raise Exception('Missing settings tag Chromosome in genome position datatable.')
            if not loadSettings.HasToken('Position'):
                raise Exception('Missing settings tag Position in genome position datatable.')
            
            self._chrom = loadSettings['Chromosome']
            self._pos = loadSettings['Position']
            
      
            
        #Settings connected to 2D data tables - add columns if present
        if loadSettings.HasToken('ColumnDataTable'):
            self._columnDataTable = loadSettings['ColumnDataTable'] 
            
        if loadSettings.HasToken('RowDataTable'):
            self._rowDataTable = loadSettings['RowDataTable']
            

    #Keep the log messages so that they can be output in one go so that log is less confusing
    def _log(self, message):
        self._logMessages.append(message)
        
    def printLog(self):
        self._responder.Log('\n#######'.join(self._logMessages))
       
    #Reimplemented here because of logging 
    def _execSql(self, sql):
        self._log("LoadTable SQL:" + self._datasetId + ';' + sql)
        start = time.time()
        with DBCursor(self._responder.credentialInfo, self._datasetId, local_infile = 1) as cur:
            cur.db.autocommit(True)
            cur.execute(sql)
        self._log('<---Finished (Elapsed: {0:.1f}s)'.format(time.time() - start))   
        
    # Columns: list of dict
    #       name
    #       DataType: Value, Boolean, Text
    
    def _parseHeader(self, header):
        self._fileColNames = [colname.replace(' ', '_') for colname in header.rstrip('\n\r').split(self._separator)]
        self._log('File columns: ' + str(self._fileColNames))
        self._fileColIndex = {self._fileColNames[i]: i for i in range(len(self._fileColNames))}
        if not(self._autoPrimKey) and (self._primkey not in self._fileColIndex):
            raise Exception('File is missing primary key '+self._primkey)
        for col in self._columns:
            # if 'ReadData' not in col:
            #     print('==========' + str(col))
            colname = col['name']
            if (col['ReadData']) and (colname not in self._fileColIndex):
                raise Exception('File is missing column '+colname)
    
    #Used if not bulk loading to encode the data for an insert statement
    def _encodeCell(self, icontent, col):
        content = icontent
        if col['IsString']:
            if len(icontent) == 0:
                content = "''"
            else:
                try:
                    content = content.encode('ascii', 'ignore')
                except UnicodeDecodeError:
                    print('Unable to encode '+content)
                    content='*failed encoding*'
                content = content.replace("\x92", "'")
                content = content.replace("\xC2", "'")
                content = content.replace("\x91", "'")
                #filter(lambda x: x in string.printable, val)
                content = content.replace("'", "\\'")
                content = content.replace('\r\n', '\\n')
                content = content.replace('\n\r', '\\n')
                content = '\'' + content + '\''

        if col['IsValue']:
            if (content == 'NA') or (content == '') or (content == 'None') or (content == 'NULL') or (content == 'null') or (content == 'inf') or (content == '-'):
                content = 'NULL'

        if col['IsDate']:
            if len(content)>=5:
                try:
                    dt = dateutil.parser.parse(content)
                    tmdiff  =(dt - datetime.datetime(1970, 1, 1)).days
                    tmdiff += 2440587.5 +0.5 # note: extra 0.5 because we set datestamp at noon
                    content = str(tmdiff)
                except:
                    print('ERROR: date parsing string '+content)
                    content = 'NULL'
            else:
                content = 'NULL'

        if col['IsBoolean']:
            vl = content
            content = 'NULL'
            if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1'):
                content = '1'
            if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0'):
                content = '0'

        return content

    def _parseLine(self, line):
        
        sourceCells = line.split(self._separator)
        
        writeCells = []
        
        for col in self._columns:

            content = 'NULL'

            if col['name'] in self._fileColIndex:
                content = sourceCells[self._fileColIndex[col['name']]]
                content = self._encodeCell(content, col)
                
            
            if col['IsString']:
                col['MaxLen'] = max(col['MaxLen'], len(content))
                
            writeCells.append(content)
            
        return writeCells
              
    def _writeInsertLine(self, ofp, tableid, writeCells):
        if not(self._blockStarted):
            ofp.write('INSERT INTO {0} ({1}) VALUES '.format(DBTBESC(tableid), ', '.join([DBCOLESC(col) for col in self._colNameList])))
            self._blockStarted = True
            self._blockNr = 0

        if self._blockNr > 0:
            ofp.write(',')
        ofp.write('(')
        ofp.write(','.join(writeCells))
        ofp.write(')')
        self._blockNr += 1
        if self._blockNr >= self._blockSize:
            ofp.write(';\n')
            self._blockStarted = False
    
              

    def _createTable(self, tableid):
        sql = 'CREATE TABLE {0} (\n'.format(DBTBESC(tableid))
        colTokens = []
        if self._autoPrimKey:
            colTokens.append("{0} int AUTO_INCREMENT PRIMARY KEY".format(DBCOLESC(self._primkey)))
        if self._allowSubSampling:
            colTokens.append("_randomval_ double")
        
        #This is connected to Import2DDataTable - it's much quicker to add it now rather than 
        #when doing the import
        if self._columnDataTable is not None:
            colTokens.append("`{}_column_index` INT DEFAULT NULL".format(self._columnDataTable))
        if self._rowDataTable is not None:
            colTokens.append("`{}_row_index` INT DEFAULT NULL".format(self._rowDataTable))
            
        for col in self._columns:
            st = DBCOLESC(col['name'])
            typestr = ''
            if col['DataType'] == 'Text':
                typestr = 'varchar({0})'.format(max(1, col['MaxLen']))
            if len(typestr) == 0:
                typestr = ImpUtils.GetSQLDataType(col['DataType'])
            if len(typestr) == 0:
                raise Exception('Invalid property data type ' + col['DataType'])
            st += ' ' + typestr
            colTokens.append(st)
        
        sql += ', '.join(colTokens)
        sql += ')'
        return sql


    def _loadTable(self, inputFile): 
        
        colTokens = []
        transform = []
        
        for col in self._fileColNames:
            colDescrip = None
            for colMetaData in self._columns:
                if colMetaData['name'] == col:
                    colDescrip = colMetaData
                    break
                
            if colDescrip is None:
                self._log('Not loading column: ' + col)
                colTokens.append('@dummy')
            else:
                dt = colDescrip['DataType']
                if dt == 'Text':
                    colTokens.append(DBCOLESC(col))
                elif dt == 'Boolean':
                    var = '@' + col
                    colTokens.append(var)
                    ts = DBCOLESC(col) + " = CASE " + var
                    #This could be made a bit less painful by looking at the values when parsing
                    ts += " WHEN 'Yes' THEN 1 WHEN 'No' THEN 0 "
                    ts += " WHEN 'yes' THEN 1 WHEN 'no' THEN 0 "
                    ts += " WHEN 'YES' THEN 1 WHEN 'NO' THEN 0 "
                    ts += " WHEN 'y' THEN 1 WHEN 'n' THEN 0 "
                    ts += " WHEN 'Y' THEN 1 WHEN 'N' THEN 0 "
                    ts += " WHEN 'True' THEN 1 WHEN 'False' THEN 0 "
                    ts += " WHEN 'true' THEN 1 WHEN 'false' THEN 0 "
                    ts += " WHEN 'TRUE' THEN 1 WHEN 'FALSE' THEN 0 "
                    ts += " END"
                    transform.append(ts)
                elif dt == 'Value' or dt == 'HighPrecisionValue' or dt == 'GeoLongitude' or dt == 'GeoLattitude':
                    var = '@' + col
                    colTokens.append(var)
                    ts = DBCOLESC(col) + " = CASE " + var
                    #This could be made a bit less painful by looking at the values when parsing
                    ts += " WHEN 'NA' THEN NULL"
                    ts += " WHEN '' THEN NULL"
                    ts += " WHEN 'None' THEN NULL"
                    ts += " WHEN 'NULL' THEN NULL"
                    ts += " WHEN 'null' THEN NULL"
                    ts += " WHEN 'inf' THEN NULL"
                    ts += " WHEN '-' THEN NULL"
                    ts += " ELSE " + var
                    ts += " END"
                    transform.append(ts)
                elif dt == 'Date':
                    var = '@' + col
                    colTokens.append(var)
                    #Set at noon
                    #The date format is interpreted as being in the current time zone e.g. 2007-11-30
                    #For other formats - see http://dev.mysql.com/doc/refman/5.6/en/date-and-time-functions.html#function_str-to-date
                    #"DATE_FORMAT(STR_TO_DATE(" + var + ", ''), '%Y-%m-%d')" 
                    ts = DBCOLESC(col) + " = UNIX_TIMESTAMP(" + var + " 12:00:00) " 
                else:
                    self._log('Defaulting to text type for column: ' + col)
                    colTokens.append(DBCOLESC(col))

        if self._allowSubSampling:
            transform.append(' _randomval_ = RAND()')
            
        ignoreLines = 1
            
        sql = "LOAD DATA LOCAL INFILE '" + inputFile + "' INTO TABLE " + DBDBESC(self._datasetId) + '.' + DBTBESC(self._tableId) 
        #This line not strictly necessary
        sql += " FIELDS TERMINATED BY '" + self._separator + "' LINES TERMINATED BY '" + self._lineSeparator + "'" 
        sql += " IGNORE " + str(ignoreLines) + " LINES "
        sql += "(" + ', '.join(colTokens)
        sql += ")"
        if len(transform) > 0:
            sql += ' SET '
            sql += ','.join(transform)
        
        #Note the local_infile = 1 is required if the LOCAL keyword is used above
        #This could be avoided but that would mean that the file has to be on the database server
        #LOCAL is also a bit slower
        #LOCAL also means warnings not errors
#        with warnings.catch_warnings():
        warnings.filterwarnings('error', category=MySQLdb.Warning)
        self._execSql(sql)
        
        

    def _addIndexes(self):
        
        tableid = self._tableId
        
        
        if not (self._autoPrimKey):
            try:
                self._execSql('create unique index {2} ON {0}({1})'.format(DBTBESC(tableid), DBCOLESC(self._primkey), DBCOLESC(tableid + '_' + self._primkey)))
            except:
                e = sys.exc_info()
                self._log("Failed to create unique index: %s " % str(e))
        for col in self._columns:
            if ('Index' in col) and (col['Index']) and (col['name'] != self._primkey):
                self._execSql('create index {2} ON {0}({1})'.format(DBTBESC(tableid), DBCOLESC(col['name']), DBCOLESC(tableid + '_' + col['name'])))
                
        if self._isPositionOnGenome:
            self._log('Indexing chromosome')
            
            self._execSql('create index {0}_chrompos ON {0}({1},{2})'.format(
                tableid,
                self._chrom,
                self._pos
            ))
            
        if self._allowSubSampling:
            sql = "CREATE INDEX {1} ON {0}(_randomval_)".format(DBTBESC(tableid), DBCOLESC(tableid + '_randomindex'))
            self._execSql(sql)

    def _createSubSampleTables(self):
        
        databaseid = self._datasetId
        tableid = self._tableId
        
        if self._allowSubSampling:
            with self._responder.LogHeader('Create subsampling table'):
                self._log('Creating random data column')
                if self._bulkLoad == False:
                    sql = "UPDATE {0} SET _randomval_=RAND()".format(DBTBESC(tableid))
                    self._execSql(sql)
                
                sortRandTable = tableid + '_SORTRAND'
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    sql = "DROP TABLE IF EXISTS {0}".format(DBTBESC(sortRandTable))
                    self._execSql(sql)
                sql = "CREATE TABLE {1} LIKE {0}".format(DBTBESC(tableid), DBTBESC(sortRandTable))
                self._execSql(sql)
                if self._autoPrimKey:
                    self._log('Restructuring AutoKey')
                    sql = "alter table {0} drop column AutoKey".format(DBTBESC(sortRandTable))
                    self._execSql(sql)
                    sql = "alter table {0} add column AutoKey int FIRST".format(DBTBESC(sortRandTable))
                    self._execSql(sql)
                    sql = "create index idx_autokey on {0}(AutoKey)".format(DBTBESC(sortRandTable))
                    self._execSql(sql)
                sql = "alter table {0} add column RandPrimKey int AUTO_INCREMENT PRIMARY KEY".format(DBTBESC(sortRandTable))
                self._execSql(sql)
                sql = "insert into {1} select *,0 from {0} order by _randomval_".format(DBTBESC(tableid), DBTBESC(sortRandTable))
                sql += ' LIMIT 5000000' # NOTE: there is little point in importing more than that!
                self._execSql(sql)


    def _dropTable(self, tableid):
        return 'drop table if exists {0};'.format(DBTBESC(tableid))

    def _preprocessFile(self, sourceFileName, tableid):
        
            self._destFileName = ImpUtils.GetTempFileName()
            if (self._maxLineCount > 0):
                headFileName = ImpUtils.GetTempFileName()
                hfp = open(headFileName, 'w')
        
            with open(sourceFileName, 'r') as ifp:
                if ifp is None:
                    raise Exception('Unable to read file '+sourceFileName)
                with open(self._destFileName, 'w') as ofp:
                    if ofp is None:
                        raise Exception('Unable to write to temporary file ' + self._destFileName)
    
                    header = ifp.readline()
                    
                    if "\r\n" in header:
                        self._lineSeparator = '\r\n'
                        
                    skipParse = True
                    
                    for col in self._columns:
                        if col['MaxLen'] == 0:
                            self._log('MaxLen not set for column:' + col['name'])
                            skipParse = False
                            
                          
                    if (self._maxLineCount > 0):
                        hfp.write(header)
                    self._parseHeader(header)
            
            #If importing x lines then we need to create a temporary file
                    #If not bulkLoading the need to create a file with SQL INSERT statements
                    #If column lengths are not set then we need to calculate them
                    if self._bulkLoad and self._maxLineCount <= 0 and skipParse:
                        self._log("Skipping parse of input file")
                    else:                
                        lineCount = 0
                        for line in ifp:
                            try:
                                if (self._maxLineCount > 0):
                                    hfp.write(line)
                                    
                                line = line.rstrip('\r\n')
                                if len(line) > 0:
                                    #Still parse because of calculating column size
                                    writeCells = self._parseLine(line)
                        
                                    if self._bulkLoad == False:            
                                        self._writeInsertLine(ofp, tableid, writeCells)
                                    
                                    
                                    lineCount += 1
                                    if lineCount % 1000000 == 0:
                                        self._log('Line '+str(lineCount))
                                    if (self._maxLineCount>0) and (lineCount >= self._maxLineCount):
                                        self._log('WARNING:Terminating import at {0} lines'.format(lineCount))
                                        break
                            except Exception as e:
                                self._log('Offending line: ' + line)
                                raise Exception('Error while parsing line {0} of file "{1}": {2}'.format(
                                                                                                         lineCount + 1,
                                                                                                         sourceFileName,
                                                                                                         str(e)))
        
            if (self._maxLineCount > 0):
                hfp.close()
                            
            if self._bulkLoad:
                #Bulk load
                if (self._maxLineCount > 0):
                    sourceFileName = headFileName
                    
            return sourceFileName

                
    def run(self):
        
        try:
            sourceFileName = self._sourceFileName
            
            databaseid = self._datasetId
            tableid = self._tableId
            
            self._log('Loading table {0} from {1}'.format(tableid, sourceFileName))
        
            sourceFileName = self._preprocessFile(sourceFileName, tableid)
                          
            self._log('Column sizes: '+str({col['name']: col['MaxLen'] for col in self._columns}))
        
            self._log('Creating schema')
            try:
                self._execSql(self._dropTable(tableid))
            except:
                self._log("{} doesn't exist".format(tableid))
            self._execSql(self._createTable(tableid))
            
            self._log('Importing data')
            
            if self._bulkLoad:
                #Bulk load
                if (self._maxLineCount > 0):
                    self._loadTable(sourceFileName)
                    os.remove(sourceFileName)
                else:
                    self._loadTable(sourceFileName)
            else:
                #Import from script
                ImpUtils.ExecuteSQLScript(self._responder, self._destFileName, databaseid)
                os.remove(self._destFileName)           
            
            self._addIndexes()
            
            self._createSubSampleTables()
        
            
            
            if self._createSubsets:
                self._addSubsets()
    
        except:
            self.status = sys.exc_info()
            self._log("Exception loading table: %s " % str(self.status))
            
    def _addSubsets(self):
            logger.debug('Creating subsets table')
            datasetId = self._datasetId
            tableid = self._tableId
        
            subsetTableName = tableid + '_subsets'
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self._execSql('DROP TABLE IF EXISTS {0}'.format(DBTBESC(subsetTableName)))
            self._execSql('CREATE TABLE {subsettable} AS SELECT {primkey} FROM {table} limit 0'.format(
                subsettable=DBTBESC(subsetTableName),
                primkey=DBCOLESC(self._primkey),
                table=DBTBESC(tableid)
            ))
            self._execSql('ALTER TABLE {0} ADD COLUMN (subsetid INT)'.format(DBTBESC(subsetTableName)))
            self._execSql('CREATE INDEX primkey ON {0}({1})'.format(DBTBESC(subsetTableName), DBCOLESC(self._primkey)))
            self._execSql('CREATE INDEX subsetid ON {0}(subsetid)'.format(DBTBESC(subsetTableName)))


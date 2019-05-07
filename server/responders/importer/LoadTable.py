from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import range
import os
import sys
import time
from . import ImpUtils
import datetime
import dateutil.parser
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import DBDBESC
from DQXDbTools import DBCursor
import logging
import warnings
import threading
from .SettingsDAO import SettingsDAO

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class LoadTable(threading.Thread):
    
    def __init__(self, responder, sourceFileName, datasetId, tableId, loadSettings, importSettings, createSubsets = False, isView = False):
        
        threading.Thread.__init__(self)
        
        self.status = None
        
        self._responder = responder
        self._logMessages = []
        
        self._sourceFileName = sourceFileName
        self._datasetId = datasetId
        self._tableId = tableId
        self._separator = '\t'
        self._lineSeparator = '\n'
        self._createSubsets = createSubsets
        self._isView = isView
        
        self._loadSettings = loadSettings
     
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
        self._isPositionOnGenome = False
          
        if type(loadSettings) is dict:
            return
        
        if  loadSettings['isPositionOnGenome']:
            self._isPositionOnGenome = True
            self._chrom = loadSettings['chromosome']
            self._pos = loadSettings['position']
            
        self._dao = SettingsDAO(responder, self._datasetId, logCache = self._logMessages)
            

    #Keep the log messages so that they can be output in one go so that log is less confusing
    def _log(self, message):
        self._logMessages.append(message)
        
    def printLog(self):
        self._responder.Log('\n#######'.join(self._logMessages))
        
    # Columns: list of dict
    #       name
    #       DataType: Value, Boolean, Text
    
    def _parseHeader(self, header):
        self._fileColNames = [colname.replace(' ', '_') for colname in header.rstrip('\n\r').split(self._separator)]
        self._log('File columns: ' + str(self._fileColNames))
        self._fileColIndex = {self._fileColNames[i]: i for i in range(len(self._fileColNames))}
        if not(self._loadSettings["primKey"] == "AutoKey") and (self._loadSettings["primKey"] not in self._fileColIndex):
            raise Exception('File is missing primary key '+self._loadSettings["primKey"])
        for col in self._loadSettings.getPropertyNames():
            colname = self._loadSettings.getPropertyValue(col,"id")
            if colname not in self._fileColIndex:
                if not colname == "AutoKey":
                    raise Exception('File is missing column '+colname)

    def _parseLine(self, line):
        
        sourceCells = line.split(self._separator)
        
        writeCells = []
    
        for col in self._loadSettings.getPropertyNames():

            content = 'NULL'
            name = self._loadSettings.getPropertyValue(col,'id')
            if name in self._fileColIndex:
                content = sourceCells[self._fileColIndex[name]]
#                content = self._encodeCell(content, col)
            writeCells.append(content)
            
        return writeCells
              
    def _writeInsertLine(self, ofp, tableid, writeCells):
        if not(self._blockStarted):
            ofp.write('INSERT INTO {0} ({1}) VALUES '.format(DBTBESC(tableid), ', '.join([DBCOLESC(col) for col in self._loadSettings.getPropertyNames()])))
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

        #Get names in header file
        with open(self._sourceFileName, 'r', encoding='utf-8') as sourceFile:
            header_names = sourceFile.readline().strip().replace(' ', '_').split(self._separator)
        for col in self._loadSettings.getPropertyNames():
            if '.' in col:
                raise Exception("Column IDs cannot include '.' (%s - %s)" % (col, tableid))
            if col not in header_names and col != 'AutoKey':
                raise Exception("Can't find column %s in data file for %s" % (col, tableid))
        additional_cols = []
        for i,col in enumerate(header_names):
            if col not in self._loadSettings.getPropertyNames():
                additional_cols.append((i, col))
            if col == "AutoKey":
                continue
        if len(additional_cols) > 0:
            cols = ','.join(col for (i,col) in additional_cols)
            positions = ','.join(str(i+1) for (i,col) in additional_cols)
            raise Exception("Data file for %s contains column(s) %s at position(s) %s not seen in settings. You can "
                            "cut out this column with 'cut -f %s data --complement'" % (tableid, cols, positions, positions))
        #Table order has to be file order
        for col in header_names:
            st = DBCOLESC(self._loadSettings.getPropertyValue(col,'id'))
            st += ' ' + ImpUtils.GetSQLDataType(self._loadSettings.getPropertyValue(col,'dataType'))
            colTokens.append(st)
        
        sql += ', '.join(colTokens)
        sql += ')'
        return sql


    def _loadTable(self, inputFile):
        sql = "COPY OFFSET 2 INTO %s from '%s' USING DELIMITERS '%s','%s' NULL AS '' LOCKED" % (DBTBESC(self._tableId), inputFile, self._separator, self._lineSeparator);
        self._dao._execSql(sql)

        if self._loadSettings["primKey"] == "AutoKey":
            self._dao._execSql("ALTER TABLE %s ADD COLUMN %s int AUTO_INCREMENT PRIMARY KEY" % (DBTBESC(self._tableId),
                                                                                            DBCOLESC(self._loadSettings["primKey"])))

    def _addIndexes(self):
        
        tableid = self._tableId
        
        
        if not (self._loadSettings["autoKey"] == self._loadSettings["primKey"]):
            self._dao.createIndex(tableid + '_' + self._loadSettings["primKey"], tableid, self._loadSettings["primKey"], unique = True)
            
        for col in self._loadSettings.getPropertyNames():
            name = self._loadSettings.getPropertyValue(col, 'id')
            if self._loadSettings.getPropertyValue(col, 'index') and col != self._loadSettings["primKey"]:
                self._dao.createIndex(tableid + '_' + name, tableid, name)
                
        if self._isPositionOnGenome:
            self._log('Indexing chromosome')
            self._dao.createIndex(tableid + '_chrompos', tableid, self._chrom + "," + self._pos)

    def _preprocessFile(self, sourceFileName, tableid):
        
            self._destFileName = ImpUtils.GetTempFileName()
            if (self._maxLineCount > 0):
                headFileName = ImpUtils.GetTempFileName()
                hfp = open(headFileName, 'w', encoding='utf-8')
        
            with open(sourceFileName, 'r', encoding='utf-8') as ifp:
                if ifp is None:
                    raise Exception('Unable to read file '+sourceFileName)
                with open(self._destFileName, 'w', encoding='utf-8') as ofp:
                    if ofp is None:
                        raise Exception('Unable to write to temporary file ' + self._destFileName)

                    header = ifp.readline()
                    
                    if "\r\n" in header:
                        self._lineSeparator = '\r\n'
                        
                    skipParse = True
                    
                    if (self._maxLineCount > 0):
                        hfp.write(header)
                    self._parseHeader(header)
            
            #If importing x lines then we need to create a temporary file
                    #If column lengths are not set then we need to calculate them
                    if self._maxLineCount <= 0 and skipParse:
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

                                    lineCount += 1
                                    if lineCount % 1000000 == 0:
                                        self._log('Line '+str(lineCount))
                                    if (self._maxLineCount>0) and (lineCount >= self._maxLineCount):
                                        self._log('WARNING:Terminating import at {0} lines'.format(lineCount))
                                        break
                            except:
                                exc_type, exc_obj, tb = sys.exc_info()
                                f = tb.tb_frame
                                lineno = tb.tb_lineno
                                filename = f.f_code.co_filename
                                linecache.checkcache(filename)
                                line = linecache.getline(filename, lineno, f.f_globals)
                                
                                self._log('Offending line: ' + line)
                                raise Exception('Error while parsing line {0} of file "{1}": {2} {3} {4} {5}'.format(
                                                                                                         lineCount + 1,
                                                                                                         sourceFileName,
                                                                                                         filename,
                                                                                                         lineno, line.strip(), exc_obj))
        
            if (self._maxLineCount > 0):
                hfp.close()

            if (self._maxLineCount > 0):
                sourceFileName = headFileName

            return sourceFileName

                
    def run(self):
        
        try:
            sourceFileName = self._sourceFileName
            
            databaseid = self._datasetId
            tableid = self._tableId

            if self._isView:
                self._log('Creating view {0} from {1}'.format(tableid, sourceFileName))
                try:
                    self._dao.dropTable(tableid)
                except:
                    self._log("{} doesn't exist".format(tableid))
                with open(sourceFileName, 'r') as viewFile:
                    viewSpec = viewFile.read()
                self._dao._execSql('CREATE VIEW {0} AS {1}'.format(tableid, viewSpec))
                return

            self._log('Loading table {0} from {1}'.format(tableid, sourceFileName))
        
            sourceFileName = self._preprocessFile(sourceFileName, tableid)
                          
            self._log('Creating schema')
            try:
                self._dao.dropTable(tableid)
            except:
                self._log("{} doesn't exist".format(tableid))
            self._dao._execSql(self._createTable(tableid))
            
            self._log('Importing data')

            self._loadTable(sourceFileName)
            if (self._maxLineCount > 0):
                os.remove(sourceFileName)

            
            self._addIndexes()
            
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
            
            try:
                self._dao.dropTable(subsetTableName)
            except:
                pass
            
            self._dao._execSql('CREATE TABLE {subsettable} AS SELECT {primkey} FROM {table} with no data'.format(
                subsettable=DBTBESC(subsetTableName),
                primkey=DBCOLESC(self._loadSettings["primKey"]),
                table=DBTBESC(tableid)
            ))
            self._dao._execSql('ALTER TABLE {0} ADD COLUMN subsetid INT'.format(DBTBESC(subsetTableName)))
            # Taken out when changing to monetdb, need to understand if these are needed.
            # self._dao.createIndex('primkey',subsetTableName, self._loadSettings["primKey"])
            # self._dao.createIndex('subsetid',subsetTableName, 'subsetid')
            


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
    
    def __init__(self, responder, sourceFileName, datasetId, tableId, loadSettings, importSettings, createSubsets = False, isView = False, dao = None):
        
        threading.Thread.__init__(self)
        
        self.status = None
        
        self._responder = responder
        self._logMessages = []
        
        self._sourceFileName = sourceFileName
        self._datasetId = datasetId
        self._tableId = tableId
        self._separator = '\t'
        self._lineSeparator = '\n'
        self._quote = '"'
        self._createSubsets = createSubsets
        self._isView = isView
        self._loadSettings = loadSettings

        #Defaults in case loadSettings is a dict
        self._isPositionOnGenome = False
          
        if type(loadSettings) is dict:
            return
        
        if  loadSettings['isPositionOnGenome']:
            self._isPositionOnGenome = True
            self._chrom = loadSettings['chromosome']
            self._pos = loadSettings['position']
            
        self._dao = dao or SettingsDAO(responder, self._datasetId, logCache = self._logMessages)
            

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


    def _createTable(self):
        sql = 'CREATE TABLE {0} (\n'.format(DBTBESC(self._tableId))
        colTokens = []

        #Get names in header file
        with open(self._sourceFileName, 'r', encoding='utf-8') as sourceFile:
            header_names = sourceFile.readline().strip().replace(' ', '_').split(self._separator)
        for col in self._loadSettings.getPropertyNames():
            if '.' in col:
                raise Exception("Column IDs cannot include '.' (%s - %s)" % (col, self._tableId))
            if col not in header_names and col != 'AutoKey':
                raise Exception("Can't find column %s in data file for %s" % (col, self._tableId))
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
                            "cut out this column with 'cut -f %s data --complement'" % (self._tableId, cols, positions, positions))
        #Table order has to be file order
        for col in header_names:
            st = DBCOLESC(self._loadSettings.getPropertyValue(col,'id'))
            st += ' ' + ImpUtils.GetSQLDataType(self._loadSettings.getPropertyValue(col,'dataType'))
            colTokens.append(st)
        
        sql += ', '.join(colTokens)
        sql += ')'
        return sql


    def _loadTable(self, inputFile):
        sql = "COPY OFFSET 2 INTO %s from '%s' USING DELIMITERS '%s','%s','%s' NULL AS ''" % (DBTBESC(self._tableId), inputFile, self._separator, self._lineSeparator, self._quote)
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
                
    def run(self):
        
        try:
            sourceFileName = self._sourceFileName
            
            databaseid = self._datasetId
            tableid = self._tableId

            if self._isView:
                self._log('Creating view {0} from {1}'.format(tableid, sourceFileName))
                with open(sourceFileName, 'r') as viewFile:
                    viewSpec = viewFile.read()
                self._dao._execSql('CREATE VIEW {0} AS {1}'.format(tableid, viewSpec))
                return

            self._log('Loading table {0} from {1}'.format(tableid, sourceFileName))
            self._dao._execSql(self._createTable())
            self._log('Importing data')
            self._loadTable(sourceFileName)
            self._addIndexes()

        except:
            self.status = sys.exc_info()
            self._log("Exception loading table: %s " % str(self.status))



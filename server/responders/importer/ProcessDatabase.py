from __future__ import absolute_import
from builtins import str
import logging
import linecache
import os

from .BaseImport import BaseImport
from .LoadTable import LoadTable
from . import ImpUtils

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ProcessDatabase(BaseImport):
        
    def cleanUp(self):
        if not self._importSettings['ConfigOnly']:
            #Wait for the database loader thread to return
            self._dbloader.join()
            if self._toDelete:
                os.remove(self._toDelete)

            self._dbloader.printLog()
    
            if self._dbloader.status is not None:
                self._log(str(self._dbloader.status))
                exc_type, exc_obj, tb = self._dbloader.status
                f = tb.tb_frame
                lineno = tb.tb_lineno
                filename = f.f_code.co_filename
                linecache.checkcache(filename)
                line = linecache.getline(filename, lineno, f.f_globals)
                raise Exception("Database loading failed {} {} {} {}".format(filename, lineno, line.strip(), exc_obj))

    def importData(self, tableid, inputFile = None, createSubsets = False, loadSettings = None):

        if loadSettings is None:
            loadSettings = self._fetchSettings(tableid)
        isView = False
        if inputFile is None:
            settings, data, isView = self._getDataFiles(tableid)
        else:
            data = inputFile

        hdf = (data[-4:] == 'hdf5')
        self._toDelete = None
        if hdf:
            data = ImpUtils.tabFileFromHDF5(loadSettings, data)
            self._toDelete = data
        self._dbloader = LoadTable(self._calculationObject, data, self._datasetId, tableid, loadSettings, self._importSettings, createSubsets, isView)
        if not self._importSettings['ConfigOnly']:
            self._log(("Preparing to load {} to {}.{}").format(data, self._datasetId, tableid))
            self._dbloader.start()

    

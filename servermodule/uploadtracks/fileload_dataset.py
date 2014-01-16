import DQXDbTools
import uuid
import os
import config
from DQXTableUtils import VTTable
import time
import asyncresponder
import sys

import importer.ImportFiles


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ConfigOnly'] == '1':
        importSettings['ConfigOnly'] = True
    importer.ImportFiles.ImportDataSet(
        calculationObject,
        config.SOURCEDATADIR + '/datasets',
        datasetid,
        importSettings
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load dataset {0}".format(returndata['datasetid'])
    )
    return retval

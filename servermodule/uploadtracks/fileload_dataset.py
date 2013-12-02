import DQXDbTools
import uuid
import os
import config
import VTTable
import time
import asyncresponder
import sys

print(sys.path)
import importer.ImportFiles


def ResponseExecute(data, calculationObject):
    importer.ImportFiles.ImportDataSet(calculationObject, config.SOURCEDATADIR + '/datasets', 'Sample')

def response(returndata):
    retval = asyncresponder.RespondAsync(ResponseExecute, returndata, "Load dataset")
    return retval

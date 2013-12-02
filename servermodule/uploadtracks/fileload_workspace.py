import DQXDbTools
import uuid
import os
import config
import VTTable
import time
import asyncresponder
import sys

print(sys.path)
import importer.ImportWorkspaces


def ResponseExecute(data, calculationObject):
    datasetid = data['dataset']
    workspaceid = data['workspace']
    importer.ImportWorkspaces.ImportWorkspace(
        calculationObject,
        datasetid,
        workspaceid,
        config.SOURCEDATADIR + '/datasets/' + datasetid + '/workspaces/' + workspaceid
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(ResponseExecute, returndata, "Load workspace")
    return retval

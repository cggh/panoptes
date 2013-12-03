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
    datasetid = data['datasetid']
    workspaceid = data['workspaceid']
    sourceid = data['sourceid']
    tableid = data['tableid']
    importer.ImportWorkspaces.ImportCustomData(
        calculationObject,
        datasetid,
        workspaceid,
        tableid,
        os.path.join(config.SOURCEDATADIR, 'datasets', datasetid, 'workspaces', workspaceid, 'customdata', tableid, sourceid)
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(ResponseExecute, returndata, "Load workspace")
    return retval

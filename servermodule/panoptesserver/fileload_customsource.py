import DQXDbTools
import uuid
import os
import config
from DQXTableUtils import VTTable
import time
import asyncresponder
import sys

import importer.ImportWorkspaces


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    workspaceid = data['workspaceid']
    sourceid = data['sourceid']
    tableid = data['tableid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']
    importer.ImportWorkspaces.ImportCustomData(
        calculationObject,
        datasetid,
        workspaceid,
        tableid,
        sourceid,
        os.path.join(config.SOURCEDATADIR, 'datasets', datasetid, 'workspaces', workspaceid, 'customdata', tableid, sourceid),
        importSettings
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load custom source {0}.{1}.{2}".format(returndata['datasetid'], returndata['workspaceid'], returndata['sourceid'])
    )
    return retval

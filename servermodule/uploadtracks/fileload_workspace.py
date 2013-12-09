import DQXDbTools
import uuid
import os
import config
import VTTable
import time
import asyncresponder
import sys

import importer.ImportWorkspaces


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    workspaceid = data['workspaceid']
    importSettings = {}
    importSettings['ConfigOnly'] = data['ConfigOnly']
    importer.ImportWorkspaces.ImportWorkspace(
        calculationObject,
        datasetid,
        workspaceid,
        config.SOURCEDATADIR + '/datasets/' + datasetid + '/workspaces/' + workspaceid,
        importSettings
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load workspace {0}.{1}".format(returndata['datasetid'], returndata['workspaceid'])
    )
    return retval

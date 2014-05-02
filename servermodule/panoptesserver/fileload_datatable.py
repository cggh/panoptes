import config
import asyncresponder
import os

import importer.ImportDataTable
import importer.ImportWorkspaces


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    tableid = data['tableid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']

    datasetFolder = os.path.join(config.SOURCEDATADIR, 'datasets', datasetid)

    datatableFolder = os.path.join(datasetFolder, 'datatables', tableid)
    importer.ImportDataTable.ImportDataTable(
        calculationObject,
        datasetid,
        tableid,
        datatableFolder,
        importSettings
    )

    importer.ImportWorkspaces.ImportWorkspaces(calculationObject, datasetFolder, datasetid, importSettings)

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load datatable {0}.{1}".format(returndata['datasetid'], returndata['tableid'])
    )
    return retval

import config
import asyncresponder
import os

import importer.ImportDataTable


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    tableid = data['tableid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ConfigOnly'] == '1':
        importSettings['ConfigOnly'] = True

    datatableFolder = os.path.join(config.SOURCEDATADIR, 'datasets', datasetid, 'datatables', tableid)
    importer.ImportDataTable.ImportDataTable(
        calculationObject,
        datasetid,
        tableid,
        datatableFolder,
        importSettings
    )

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load datatable {0}.{1}".format(returndata['datasetid'], returndata['tableid'])
    )
    return retval

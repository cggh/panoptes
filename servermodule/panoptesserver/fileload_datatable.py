# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import asyncresponder
import os

import importer.ImportDataTable
import importer.Import2DDataTable
import importer.ImportWorkspaces
import importer.ImportError


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    tableid = data['tableid']
    type = data['type']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']

    datasetFolder = os.path.join(config.SOURCEDATADIR, 'datasets', datasetid)
    if type == 'datatable':
        datatableFolder = os.path.join(datasetFolder, 'datatables', tableid)
        try:
            importer.ImportDataTable.ImportDataTable(
                calculationObject,
                datasetid,
                tableid,
                datatableFolder,
                importSettings
            )
        except importer.ImportError.ImportException as e:
            calculationObject.fail(str(e))
        importer.ImportWorkspaces.ImportWorkspaces(calculationObject, datasetFolder, datasetid, importSettings)

    if type == '2D_datatable':
        datatableFolder = os.path.join(datasetFolder, '2D_datatables', tableid)
        try:
            importer.Import2DDataTable.ImportDataTable(
                calculationObject,
                datasetid,
                tableid,
                datatableFolder,
                importSettings
            )
        except importer.ImportError.ImportException as e:
            calculationObject.fail(str(e))

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load datatable {0}.{1}".format(returndata['datasetid'], returndata['tableid'])
    )
    return retval

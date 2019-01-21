from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from . import asyncresponder

from .importer.ImportDataTable import ImportDataTable
from .importer.Import2DDataTable import Import2DDataTable
from .importer import ImportError


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    tableid = data['tableid']
    importtype = data['type']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']
    importSettings['SkipTableTracks'] = data['SkipTableTracks']


    if importtype == 'datatable':

        try:
            idt = ImportDataTable(
                calculationObject,
                datasetid,
                importSettings
            )
            idt.ImportDataTable(tableid)
        except ImportError.ImportException as e:
            calculationObject.fail(str(e))

    if importtype == '2D_datatable':

        try:
            i2d = Import2DDataTable(
                calculationObject,
                datasetid,
                importSettings,
                dataDir = '2D_datatables'
            )
            i2d.ImportDataTable(tableid)
        except ImportError.ImportException as e:
            calculationObject.fail(str(e))

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load datatable {0}.{1}".format(returndata['datasetid'], returndata['tableid'])
    )
    return retval

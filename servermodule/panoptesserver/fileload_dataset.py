# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import asyncresponder

import importer.ImportFiles
import importer.ImportError

def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']
    importSettings['SkipTableTracks'] = data['SkipTableTracks']
    try:
        importer.ImportFiles.ImportDataSet(
            calculationObject,
            config.SOURCEDATADIR + '/datasets',
            datasetid,
            importSettings
        )
    except importer.ImportError.ImportException as e:
        calculationObject.fail(str(e))

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load dataset {0}".format(returndata['datasetid'])
    )
    return retval

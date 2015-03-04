# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import asyncresponder

import importer.ImportWorkspaces
import importer.ImportError


def ResponseExecute(data, calculationObject):
    datasetid = data['datasetid']
    workspaceid = data['workspaceid']
    importSettings = {}
    importSettings['ConfigOnly'] = False
    if data['ScopeStr'] == 'none':
        importSettings['ConfigOnly'] = True
    importSettings['ScopeStr'] = data['ScopeStr']
    importSettings['SkipTableTracks'] = data['SkipTableTracks']


    try:
        importer.ImportWorkspaces.ImportWorkspace(
            calculationObject,
            datasetid,
            workspaceid,
            config.SOURCEDATADIR + '/datasets/' + datasetid + '/workspaces/' + workspaceid,
            importSettings
        )
    except importer.ImportError.ImportException as e:
        calculationObject.fail(str(e))

def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Load workspace {0}.{1}".format(returndata['datasetid'], returndata['workspaceid'])
    )
    return retval

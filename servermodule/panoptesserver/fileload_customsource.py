# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

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

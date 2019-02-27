# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os

from os.path import join
import DQXDbTools
from os.path import exists
import config


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    graphid = DQXDbTools.ToSafeIdentifier(returndata['graphid'])

    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationRead(databaseName))

    filename = join(config.BASEDIR, 'Graphs', databaseName, tableid, graphid)
    if not(exists(filename)):
        returndata['Error'] = 'Unable to find graph data'
        return
    try:
        with open(filename, 'r') as fp:
            returndata['data'] = fp.read()
    except Exception as e:
        returndata['Error'] = str(e)

    return returndata
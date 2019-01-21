from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
from . import authorization
import DQXbase64


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)

    sourcetype = DQXDbTools.ToSafeIdentifier(returndata['sourcetype'])
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName))


    baseFolder = config.SOURCEDATADIR + '/datasets'

    settingsFile = None
    if sourcetype == 'dataset':
        settingsFile = os.path.join(baseFolder, databaseName, 'settings')
    if sourcetype == 'datatable':
        settingsFile = os.path.join(baseFolder, databaseName, 'datatables', tableid, 'settings')
    if sourcetype == '2D_datatable':
        settingsFile = os.path.join(baseFolder, databaseName, '2D_datatables', tableid, 'settings')
    if settingsFile is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata

    try:
        if not os.path.exists(settingsFile):
            returndata['content'] = ''
        else:
            with open(settingsFile, 'r') as fp:
                content = fp.read()
                returndata['content'] = DQXbase64.b64encode_var2(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata
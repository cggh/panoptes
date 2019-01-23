# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
import DQXbase64


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)
    sourcetype = DQXDbTools.ToSafeIdentifier(returndata['sourcetype'])
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName))

    baseFolder = config.SOURCEDATADIR + '/datasets'

    dataFile = None
    if sourcetype == 'datatable':
        dataFile = os.path.join(baseFolder, databaseName, 'datatables', tableid, 'data')
    if dataFile is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata

    try:
        if not os.path.exists(dataFile):
            returndata['content'] = ''
        else:
            with open(dataFile, 'r') as fp:
                content = ''
                linecount = 0
                for line in fp:
                    content += line
                    if linecount > 100:
                        break
                    linecount += 1
                returndata['content'] = DQXbase64.b64encode_var2(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata
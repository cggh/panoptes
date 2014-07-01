# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import DQXDbTools
import authorization


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    for char in ['.', ' ', ',', '/', '"', "'"]:
        workspaceid = workspaceid.replace(char, '_')
    returndata['workspaceid'] = workspaceid

    baseFolder = config.SOURCEDATADIR + '/datasets'

    try:
        dataFolder = os.path.join(baseFolder, databaseName)
        os.makedirs(os.path.join(dataFolder, 'workspaces', workspaceid))
        with open(os.path.join(dataFolder, 'workspaces', workspaceid, 'settings'), 'w') as fp:
            fp.write('Name: ' + workspaceid + '\n')

    except Exception as e:
        returndata['Error'] = 'Failed to create workspace: ' + str(e)

    return returndata
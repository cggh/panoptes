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
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    for char in ['.', ' ', ',', '/', '"', "'"]:
        databaseName = databaseName.replace(char, '_')
    returndata['database'] = databaseName


    baseFolder = config.SOURCEDATADIR + '/datasets'

    try:
        dataFolder = os.path.join(baseFolder, databaseName)
        if os.path.exists(dataFolder):
            returndata['Error'] = 'Dataset {0} already exists'.format(databaseName)
            return returndata
        os.makedirs(dataFolder)
        with open(os.path.join(dataFolder, 'settings'), 'w') as fp:
            fp.write('Name: {0}\n'.format(databaseName))
        os.makedirs(os.path.join(dataFolder, 'datatables'))
        os.makedirs(os.path.join(dataFolder, 'workspaces', 'workspace1'))
        with open(os.path.join(dataFolder, 'workspaces', 'workspace1', 'settings'), 'w') as fp:
            fp.write('Name: Workspace 1\n')

    except Exception as e:
        returndata['Error'] = 'Failed to create dataset: ' + str(e)

    return returndata
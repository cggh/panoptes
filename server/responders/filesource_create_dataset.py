from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
from . import authorization


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

    except Exception as e:
        returndata['Error'] = 'Failed to create dataset: ' + str(e)

    return returndata
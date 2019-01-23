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

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    encodedstr = returndata['content']

    content = DQXbase64.b64decode_var2(encodedstr)

    baseFolder = config.SOURCEDATADIR + '/datasets'
    genomeFolder = os.path.join(baseFolder, databaseName, 'refgenome')
    settingsFile = os.path.join(genomeFolder, 'chromosomes')

    try:
        if not os.path.exists(genomeFolder):
            os.makedirs(genomeFolder)
        with open(settingsFile, 'w') as fp:
            fp.write(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata
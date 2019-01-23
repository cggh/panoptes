from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
import DQXUtils
from . import authorization
import shutil
import Utils


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    fileid = DQXDbTools.ToSafeIdentifier(returndata['fileid'])

    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    for char in ['.', ' ', ',', '/', '"', "'"]:
        tableid = tableid.replace(char, '_')

    if tableid in DQXUtils.reservedTableNames:
        tableid += '_'

    baseFolder = config.SOURCEDATADIR + '/datasets'

    filename = os.path.join(config.BASEDIR, 'Uploads', DQXDbTools.ToSafeIdentifier(fileid))
    destFolder = os.path.join(baseFolder, databaseName, 'datatables', tableid)

    try:
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        shutil.copyfile(filename, os.path.join(destFolder, 'data'))

        dataFileName = os.path.join(destFolder, 'settings')
        if not os.path.exists(dataFileName):
            with open(dataFileName, 'w') as fp:
                fp.write('NameSingle: item\nNamePlural: items\nPrimKey: AutoKey\n\nAutoScanProperties: true\n')

    except Exception as e:
        returndata['Error'] = str(e)

    os.remove(filename)

    returndata['tableid'] = tableid
    return returndata
from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
#As the db is local to panoptes set this here:
config.DB = "datasets"
import DQXDbTools
from . import authorization
import shutil
from .importer import ImpUtils
from . import asyncresponder
from DQXDbTools import DBDBESC
from DQXDbTools import DBTBESC


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)

    sourcetype = DQXDbTools.ToSafeIdentifier(returndata['sourcetype'])
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    baseFolder = config.SOURCEDATADIR + '/datasets'

    calculationObject = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')

    dataFolder = None
    if sourcetype == 'dataset':
        dataFolder = os.path.join(baseFolder, databaseName)
        authorization.VerifyIsDataSetManager(credInfo, databaseName)
        ImpUtils.ExecuteSQL(calculationObject, config.DB, 'DROP DATABASE IF EXISTS {0}'.format(DBDBESC(databaseName)))
        ImpUtils.ExecuteSQL(calculationObject, config.DB, 'DELETE FROM datasetindex WHERE id="{0}"'.format(databaseName))


    if sourcetype == 'datatable':
        dataFolder = os.path.join(baseFolder, databaseName, 'datatables', tableid)
        authorization.VerifyIsDataSetManager(credInfo, databaseName)
        ImpUtils.ExecuteSQL(calculationObject, databaseName, 'DROP TABLE IF EXISTS {0}'.format(DBTBESC(tableid)))

    if sourcetype == '2D_datatable':
        dataFolder = os.path.join(baseFolder, databaseName, '2D_datatables', tableid)
        authorization.VerifyIsDataSetManager(credInfo, databaseName)
        ImpUtils.mkdir(os.path.join(config.BASEDIR, '2D_data'))
        path_join = os.path.join(config.BASEDIR, '2D_data', databaseName + '_' + tableid + '.hdf5')
        try:
            os.remove(path_join)
        except OSError:
            pass

    if dataFolder is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata



    try:
        shutil.rmtree(dataFolder)

    except Exception as e:
        returndata['Error'] = 'Failed to delete data: ' + str(e)

    return returndata
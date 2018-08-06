# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
from cache import getCache
from importer import configReadWrite

def response(returndata):
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationRead(returndata['dataset']))

    cache = getCache()
    cacheKey = 'config' + returndata['dataset']

    if not os.getenv('STAGING', '') and not os.getenv('DEVELOPMENT', ''):
        try:
            result = cache[cacheKey]
        except KeyError:
            result = configReadWrite.readJSONConfig(returndata['dataset'])
            cache.set(cacheKey, result, expire=5*60)
    else:
        result = configReadWrite.readJSONConfig(returndata['dataset'])

    returndata['config'] = result
    return returndata

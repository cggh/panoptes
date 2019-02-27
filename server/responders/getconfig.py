from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
from .importer import configReadWrite

def response(returndata):
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationRead(returndata['dataset']))
    result = configReadWrite.getJSONConfig(returndata['dataset'], not os.getenv('STAGING', '') and not os.getenv('DEVELOPMENT', ''))
    returndata['config'] = result
    return returndata

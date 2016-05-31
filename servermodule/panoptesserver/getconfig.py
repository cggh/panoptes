# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import os
import uuid
import DQXDbTools
import authorization
import schemaversion
from importer import readConfig

def response(returndata):
    returndata['config'] = readConfig.readJSONConfig(returndata['dataset'])
    return returndata

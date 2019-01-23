# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
from DQXTableUtils import VTTable


def response(returndata):

    filename = os.path.join(config.BASEDIR, 'Uploads', returndata['fileid'])
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    try:
        tb.LoadFile(filename, 100)
        columns = tb.GetColList()
        returndata['columns'] = ';'.join(columns)
    except Exception as e:
        returndata['Error'] = str(e)
        return returndata

    return returndata
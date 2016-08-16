# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import uuid
import re

def GetTempID():
    return 'TMP'+str(uuid.uuid1()).replace('-', '_')

def GetTablePrimKey(tableid, cur):
    cur.execute('SELECT primkey FROM tablecatalog WHERE (id="{0}")'.format(tableid))
    return cur.fetchone()[0]
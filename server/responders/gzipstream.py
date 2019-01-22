# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from future import standard_library
standard_library.install_aliases()
import io
from gzip import GzipFile

def gzip(data):
    out = io.BytesIO()
    f = GzipFile(fileobj=out, mode='w')
    f.write(data)
    f.close()
    return out.getvalue()
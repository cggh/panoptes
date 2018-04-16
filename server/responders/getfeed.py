# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import urllib2
import xmltodict
import DQXbase64
import json
from cache import getExpiringCache

def response(returndata):
    url = returndata['url']
    
    cache = getExpiringCache()
    cacheKey = json.dumps([url])
    returndata['content'] = None
    if returndata['cache']:
        try:
            returndata['content'] = cache[cacheKey]
        except KeyError:
            pass
    
    if returndata['content'] is None:
        file = urllib2.urlopen(url)
        data = file.read()
        file.close()
        data = xmltodict.parse(data)
        returndata['content'] = DQXbase64.b64encode_var2(json.dumps(data))
        if returndata['cache']:
            cache[cacheKey] = returndata['content']
    
    return returndata

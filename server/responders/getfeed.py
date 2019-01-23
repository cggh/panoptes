# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from future import standard_library
standard_library.install_aliases()
import urllib.request, urllib.error, urllib.parse
import xmltodict
import DQXbase64
import json
from cache import getCache
import os

def response(returndata):
    url = returndata['url']
    
    cache = getCache()
    cacheKey = json.dumps([url])
    returndata['content'] = None
    use_cache = returndata['cache'] and not os.getenv('STAGING', '')
    if use_cache:
        try:
            returndata['content'] = cache[cacheKey]
        except KeyError:
            pass
    
    if returndata['content'] is None:
        file = urllib.request.urlopen(url)
        data = file.read()
        file.close()
        data = xmltodict.parse(data)
        returndata['content'] = DQXbase64.b64encode_var2(json.dumps(data))
        if use_cache:
            cache[cacheKey] = returndata['content']
    
    return returndata

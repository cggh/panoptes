import DQXUtils
import DQXDbTools
import re
import os
session_id_regex = re.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
static_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../webapp/dist')

def application(environ, start_response):
    #Whatever the path we return index.html as API and static requests are not passed to us
    start_response('200 OK', [('Content-type', 'text/html')])
    with open(os.path.join(static_path, 'panoptes/index.html')) as page:
        yield bytes(page.read(), 'utf-8')
    return

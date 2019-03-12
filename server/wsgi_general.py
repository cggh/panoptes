import DQXUtils
import DQXDbTools
import re
import os
session_id_regex = re.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
static_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../webapp/dist')

def application(environ, start_response):
    if environ['PATH_INFO'][:14] == '/panoptes/Docs':
        #A 404 for an unfound Doc file
        start_response('404 ' + 'Error: ' + environ['PATH_INFO'] + ' not found', [('Content-type', 'text/html')])
        yield bytes('Error: ' + environ['PATH_INFO'] + ' not found (if it is present an import maybe needed)', 'utf-8')
        return
    #Whatever the path we return index.html as API and static requests are not passed to us
    start_response('200 OK', [('Content-type', 'text/html')])
    with open(os.path.join(static_path, 'panoptes/index.html')) as page:
        yield bytes(page.read(), 'utf-8')
    return

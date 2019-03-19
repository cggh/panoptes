import DQXUtils
import DQXDbTools
import re
import os
session_id_regex = re.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
static_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../webapp/dist')

def application(environ, start_response):
    url_path_prefix = os.getenv('URL_PATH_PREFIX', '')
    docsBasePath = url_path_prefix + '/panoptes/Docs'
    if environ['PATH_INFO'][:len(docsBasePath)] == docsBasePath:
        #A 404 for an unfound Doc file
        start_response('404 ' + 'Error: ' + environ['PATH_INFO'] + ' not found', [('Content-type', 'text/html')])
        yield bytes('Error: ' + environ['PATH_INFO'] + ' not found (if it is present an import maybe needed)', 'utf-8')
        return
    #Whatever the path we return index.html as API and static requests are not passed to us
    start_response('200 OK', [('Content-type', 'text/html')])
    # join(static_path, url_path_prefix, foo) would fail because static_path contains "../", resulting in url_path_prefix + foo
    with open(os.path.join(static_path + url_path_prefix, 'panoptes/index.html')) as page:
        yield bytes(page.read(), 'utf-8')
    return

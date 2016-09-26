import DQXUtils
import DQXDbTools
import re
import os
session_id_regex = re.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
static_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../webapp/dist')

def application(environ, start_response):
    #For the root we do a relative redirect to index.html, hoping the app has one
    if environ['PATH_INFO'] == '/':
        start_response('301 Moved Permanently', [('Location', 'index.html'),])
        return

    with DQXDbTools.DBCursor() as cur:
        cur.execute('select id from datasetindex')
        datasets = [d[0] for d in cur.fetchall()]

    #Redirect to specific dataset
    path = environ['PATH_INFO'].split('/')
    if len(path) >= 2 and path[-2] in datasets and not (len(path) >= 3 and path[-3] == "Docs"):
        start_response('301 Moved Permanently', [('Location', '../index.html?dataset='+path[-2]),])
        return
    if path[-1] in datasets:
        start_response('301 Moved Permanently', [('Location', '../index.html?dataset='+path[-1]),])
        return

    #Session ids return index.html
    if len(path) > 0 and session_id_regex.match(path[-1]):
        start_response('200 OK', [])
        with open(os.path.join(static_path, 'index.html')) as page:
            yield page.read()
        return

    #Everything else is 404
    DQXUtils.LogServer('404:' + environ['PATH_INFO'])
    start_response('404 Not Found', [])
    try:
        with open(os.path.join(static_path, '404.html')) as page:
            yield page.read()
    except IOError:
        yield '404 Page Not Found'
    return

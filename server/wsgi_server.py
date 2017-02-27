# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import wsgi_api
import wsgi_general
import os
from werkzeug.wsgi import SharedDataMiddleware, DispatcherMiddleware
import config
from cas.werkzeugcas import WerkzeugCAS
import logging
from werkzeug.contrib.sessions import FilesystemSessionStore
from werkzeug.wrappers import Response

# logging.basicConfig(level=logging.DEBUG)

#This function is called if:
# Not authenticated
# the ignore_redirect regex matches the (full) url pattern
def ignored_callback(environ, start_response):
    response = Response('{"Error":"NotAuthenticated"}')
    response.status = '401 Unauthorized'
    response.headers['Content-Type'] = 'application/json'

    return response(environ, start_response)

general_with_static = SharedDataMiddleware(wsgi_general.application, {
    '/': os.path.join(os.path.dirname(config.__file__), 'webapp/dist')
}, cache_timeout=1)
application = DispatcherMiddleware(general_with_static, {
    '/panoptes/api':        wsgi_api.application,
})

#Wrap in cas service if configured
try:
    cas_service = config.CAS_SERVICE
except AttributeError:
    cas_service = ''
try:
    effective_url = config.CAS_EFFECTIVE_URL
except AttributeError:
    effective_url = None
if cas_service != '':
    fs_session_store = FilesystemSessionStore()
    cas_application = WerkzeugCAS()
    cas_application._application = application
    cas_application._session_store = fs_session_store
    cas_application.initialize(cas_root_url = cas_service,
                               logout_url = config.CAS_LOGOUT_PAGE,
                               logout_dest = config.CAS_LOGOUT_DESTINATION,
                               protocol_version = config.CAS_VERSION,
                               casfailed_url = config.CAS_FAILURE_PAGE,
                               effective_url = effective_url,
                               entry_page = '/index.html',
                               ignore_redirect = '(.*)\\api?datatype=',
                               ignored_callback = ignored_callback)
    application = cas_application




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
url_path_prefix = os.getenv('URL_PATH_PREFIX', '')
webapp_base_path = 'webapp/dist' + url_path_prefix
api_base_path = url_path_prefix + '/panoptes/api'
general_with_static = SharedDataMiddleware(wsgi_general.application, {
    '/': os.path.join(os.path.dirname(config.__file__), webapp_base_path)
}, cache_timeout=60*60)
api_application = DispatcherMiddleware(general_with_static, {
    api_base_path:        wsgi_api.application,
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
try:
    ssl_service = config.CAS_SSL_SERVICE
except AttributeError:
    ssl_service = False


if cas_service != '':
    # This function is called if:
    # Not authenticated
    # the ignore_redirect regex matches the (full) url pattern
    def ignored_callback(environ, start_response):
        return api_application(environ, start_response)

    fs_session_store = FilesystemSessionStore()
    cas_application = WerkzeugCAS()
    cas_application._application = api_application
    cas_application._session_store = fs_session_store
    cas_application.initialize(cas_root_url = cas_service,
                               logout_url = config.CAS_LOGOUT_PAGE,
                               logout_dest = config.CAS_LOGOUT_DESTINATION,
                               protocol_version = config.CAS_VERSION,
                               casfailed_url = config.CAS_FAILURE_PAGE,
                               effective_url = effective_url,
                               ssl_service = ssl_service,
                               entry_page = '/index.html',
                               ignore_redirect = '(.*)',
                               ignored_callback = ignored_callback)
    application = cas_application
else:
    application = api_application



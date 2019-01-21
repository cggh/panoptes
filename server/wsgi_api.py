# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from urllib.parse import parse_qs

import config
from os.path import join

import simplejson
import traceback

import DQXUtils
import DQXDbTools
import responders
import wrappedResponders
from cache import getCache

def application(environ, start_response):
    request_data = dict((k,v[0]) for k,v in parse_qs(environ['QUERY_STRING']).items())
    if 'datatype' not in request_data:
        DQXUtils.LogServer('--> request does not contain datatype')
        start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
        yield 'Not found: request does not contain datatype'
        return

    request_type = request_data['datatype']

    tm = DQXUtils.Timer()

    try:
        #Fetch the handler by request type, using some introspection magic in responders/__init__.py
        responder = getattr(wrappedResponders, request_type)
    except AttributeError:
        raise Exception("Unknown request {0}".format(request_type))


    request_data['environ'] = environ
    response = request_data
    try:
        try:
            response = responder.response(request_data)
            status = '200 OK'
        except DQXDbTools.CredentialException as e:
            print('CREDENTIAL EXCEPTION: '+str(e))
            response['Error'] = 'Credential problem: ' + str(e)
            #Pass down the cas details if there so the client can show al login link
            try:
                response['cas'] = config.CAS_SERVICE
                response['cas_logout'] = config.CAS_LOGOUT_PAGE
            except AttributeError:
                pass
            status = '403 Forbidden'
        except DQXDbTools.Timeout as e:
            status = '504 Gateway Timeout'

        #Check for a custom response (eg in downloadtable)
        if 'handler' in dir(responder):
            for item in responder.handler(start_response, response):
                yield item

        else:
        #Default is to respond with JSON
            del response['environ']
            response = simplejson.dumps(response, use_decimal=True)
            response_headers = [('Content-type', 'application/json'),
                                ('Access-Control-Allow-Origin','*'),
                                ('Content-Length', str(len(response)))]
            start_response(status, response_headers)
            yield bytes(response, 'utf-8')
    except Exception as e:
        traceback.print_exc()
        start_response('500 Server Error', [])
        yield bytes(str(e), 'utf-8')


    DQXUtils.LogServer('{0}: in wall={1}s cpu={2}s'.format(request_type, round(tm.Elapsed(),2),round(tm.ElapsedCPU(),2)))
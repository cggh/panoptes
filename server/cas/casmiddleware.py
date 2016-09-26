# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles, Ian Wright <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
import logging
import time
from cgi import parse_qs
from urllib import quote, urlencode, unquote_plus
from urlparse import urlparse
import requests
import xml.dom.minidom
from werkzeug.formparser import parse_form_data
from werkzeug.wrappers import Request,Response
import re

__all__ = ['CASMiddleware']

# Session keys
CAS_USERNAME = 'cas.username'
CAS_GROUPS = 'cas.groups'
CAS_TOKEN = 'cas.token'
CAS_GATEWAY = 'cas.gateway'

CAS_ORIGIN = 'cas.origin'

CAS_COOKIE_NAME = 'cas.cookie'

class CASMiddleware(object):

    casNamespaceUri = 'http://www.yale.edu/tp/cas'
    samlpNamespaceUri = 'urn:oasis:names:tc:SAML:2.0:protocol'
    samlNamespaceUri = 'urn:oasis:names:tc:SAML:2.0:assertion'


    def __init__(self, application,
                 cas_root_url,
                 entry_page = '/',
                 effective_url = None,
                 logout_url = '/logout',
                 logout_dest = '',
                 protocol_version = 2,
                 casfailed_url=None,
                 session_store = None,
                 ignore_redirect = None,
                 ignored_callback = None,
                 gateway_redirect = None,
                 group_separator = ';',
                 group_environ = 'HTTP_CAS_MEMBEROF'):
        self._application = application
        self._root_url = cas_root_url
        self._login_url = cas_root_url + '/login'
        self._logout_url = logout_url
        self._sso_logout_url = cas_root_url + '/logout'
        self._logout_dest = logout_dest
        self._entry_page = entry_page
        self._effective_url = effective_url
        self._protocol = protocol_version
        self._casfailed_url = casfailed_url
        self._session_store = session_store
        self._session = None
        self._cookie_expires = False
        if ignore_redirect is not None:
          self._ignore_redirect = re.compile(ignore_redirect)
          self._ignored_callback = ignored_callback
        else:
          self._ignore_redirect = None
        if gateway_redirect is not None:
          self._gateway_redirect = re.compile(gateway_redirect)
        else:
          self._gateway_redirect = None
        self._group_separator = group_separator
        self._group_environ = group_environ


    def _validate(self, service_url, ticket):
        
        if self._protocol == 2:
          validate_url = self._root_url + '/serviceValidate'
        elif self._protocol == 3:
          validate_url = self._root_url + '/p3/serviceValidate'

        r = requests.get(validate_url, params = {'service': service_url, 'ticket': ticket})
        result = r.text.encode('utf8')
        logging.debug(result)
        dom = xml.dom.minidom.parseString(result)
        username = None
        nodes = dom.getElementsByTagNameNS(self.casNamespaceUri, 'authenticationSuccess')
        if nodes:
            successNode = nodes[0]
            nodes = successNode.getElementsByTagNameNS(self.casNamespaceUri, 'user')
            if nodes:
                userNode = nodes[0]
                if userNode.firstChild is not None:
                    username = userNode.firstChild.nodeValue
                    self._set_session_var(CAS_USERNAME, username)
            nodes = successNode.getElementsByTagNameNS(self.casNamespaceUri, 'memberOf')
            if nodes:
                groupName = []
                for groupNode in nodes:
                  if groupNode.firstChild is not None:
                    groupName.append(groupNode.firstChild.nodeValue)
                if self._protocol == 2:
                #Common but non standard extension - only one value - concatenated on the server
                    self._set_session_var(CAS_GROUPS, groupName[0])
                elif self._protocol == 3:
                #So that the value is the same for version 2 or 3
                    self._set_session_var(CAS_GROUPS, '[' + self._group_separator.join(groupName) + ']')
        dom.unlink()

        return username

    def _is_session_expired(self, request):
#        
#          self._session_store.delete(self._session)
#          self._get_session(request)
#          return True
        return False

    def _remove_session_by_ticket(self, ticket_id):
      sessions = self._session_store.list()
      for sid in sessions:
        session = self._session_store.get(sid)
        logging.debug("Checking session:" + str(session))
        if CAS_TOKEN in session and session[CAS_TOKEN] == ticket_id:
          logging.info("Removed session for ticket:" + ticket_id)
          self._session_store.delete(session)

    def _is_single_sign_out(self, environ):
      logging.debug("Testing for SLO")
      if environ['REQUEST_METHOD'] == 'POST':
        current_url = environ.get('PATH_INFO','')
        origin = self._entry_page
        logging.debug("Testing for SLO:" + current_url + " vs " + origin)
        if current_url == origin:
          try:
            form = parse_form_data(environ)[1]
            request_body = form['logoutRequest']
            request_body = unquote_plus(request_body).decode('utf8') 
            logging.debug("POST:" + str(request_body))
            logging.debug("POST:" + str(environ))
            dom = xml.dom.minidom.parseString(request_body)
            nodes = dom.getElementsByTagNameNS(self.samlpNamespaceUri, 'SessionIndex')
            if nodes:
              sessionNode = nodes[0]
              if sessionNode.firstChild is not None:
                sessionId = sessionNode.firstChild.nodeValue
                logging.info("Received SLO request for:" + sessionId)
                self._remove_session_by_ticket(sessionId)
                return True
          except (Exception):
            logging.warning("Exception parsing post")
            logging.exception("Exception parsing post:" + request_body)
      return False

    def _is_logout(self, environ):
      path = environ.get('PATH_INFO','')
      logging.debug("Logout check:" + str(path) + " vs " + str(self._logout_url))
      if self._logout_url != '' and self._logout_url == path:
        return True
      return False

    def __call__(self, environ, start_response):
        request = Request(environ)
        response = Response('')
        self._get_session(request)
        if self._has_session_var(CAS_USERNAME) and not self._is_session_expired(request):
            self._set_values(environ)
            if self._is_logout(environ):
              self._do_session_logout()
              response = self._get_logout_redirect_url()
              return response(environ, start_response)
            return self._application(environ, start_response)
        else:
            params = request.args
            logging.debug('Session not authenticated' + str(self._session))
            if params.has_key('ticket'):
                # Have ticket, validate with CAS server
                ticket = params['ticket']

                service_url = self._effective_url or request.url

                service_url = re.sub(r".ticket=" + ticket, "", service_url)
                logging.debug('Service URL' + service_url)
                logging.debug(str(request))

                username = self._validate(service_url, ticket)

                if username is not None:
                    # Validation succeeded, redirect back to app
                    logging.debug('Validated ' + username)
                    self._set_session_var(CAS_ORIGIN, service_url)
                    self._set_session_var(CAS_TOKEN, ticket)
                    self._save_session()
                    response.status = '302 Moved Temporarily'
                    response.headers['Location'] = service_url
                    return response(environ, start_response)
                else:
                    # Validation failed (for whatever reason)
                    response = self._casfailed(environ, service_url, start_response)
                    return response(environ, start_response)
            else:
                #Check for single sign out
                if (self._is_single_sign_out(environ)):
                  logging.debug('Single sign out request received')
                  response.status = '200 OK'
                  return response(environ, start_response)
                if self._ignore_redirect is not None:
                  if self._ignore_redirect.match(request.url):
                    if self._ignored_callback is not None:
                      return self._ignored_callback(environ, start_response)
                is_gateway = ''
                if self._gateway_redirect is not None:
                  logging.debug('Gateway matching:' + request.url)
                  if self._gateway_redirect.match(request.url):
                    #See if we've been here before
                    gw = self._get_session_var(CAS_GATEWAY)
                    if gw != None:
                      logging.debug('Not logged in carrying on to:' + request.url)
                      self._remove_session_var(CAS_GATEWAY)
                      self._save_session()
                      #A bit paranoid but check it's the same URL
                      if gw == request.url:
                        return self._application(environ, start_response)
                    
                    logging.debug('Checking if logged in to CAS:' + request.url)
                    is_gateway = '&gateway=true'
                    self._set_session_var(CAS_GATEWAY, request.url)
                    self._save_session()
                logging.debug('Does not have ticket redirecting')
                service_url = self._effective_url or request.url
                response.status = '302 Moved Temporarily'
                response.headers['Location'] = '%s?service=%s%s' % (self._login_url, quote(service_url),is_gateway)
                response.set_cookie(CAS_COOKIE_NAME, value = self._session.sid, max_age = None, expires = None)
                return response(environ, start_response)

    def _get_session(self, request):
        sid = request.cookies.get(CAS_COOKIE_NAME)
        if sid is None:
          self._session = self._session_store.new()
          self._set_session_var('_created_time', str(time.time()))
        else:
          self._session = self._session_store.get(sid)
        self._set_session_var('_accessed_time', str(time.time()))

    def _has_session_var(self, name):
        return name in self._session 

    def _remove_session_var(self, name):
        del self._session[name] 

    def _set_session_var(self, name, value):
        self._session[name] = value
        logging.debug("Setting session:" + name + " to " + value)

    def _get_session_var(self, name):
        if name in self._session:
          return (self._session[name])
        else:
          return None

    def _save_session(self):
        if self._session.should_save:
          logging.debug("Saving session:" + str(self._session))
          self._session_store.save(self._session)
    
    def _do_session_logout(self):
        self._remove_session_var(CAS_USERNAME)
        self._remove_session_var(CAS_GROUPS)
        self._save_session()
        self._session_store.delete(self._session)

    def _get_logout_redirect_url(self):
        response = Response('')
        dest = self._logout_dest
        if dest == '' and self._has_session_var(CAS_ORIGIN):
          dest = self._get_session_var(CAS_ORIGIN)
        logging.debug("Log out dest:" + dest)
        parsed = urlparse(dest)
        if parsed.path == self._logout_url:
          dest = self._sso_logout_url
        logging.debug("Log out redirecting to:" + dest)
        response.status = '302 Moved Temporarily'
        response.headers['Location'] = '%s?service=%s' % (self._sso_logout_url, quote(dest))
        return response

    #Communicate values to the rest of the application
    def _set_values(self, environ):
        username = self._get_session_var(CAS_USERNAME)
        logging.debug('Session authenticated for ' + username)
        environ['AUTH_TYPE'] = 'CAS'
        environ['REMOTE_USER'] = str(username)
        environ[self._group_environ] = str(self._get_session_var(CAS_GROUPS))

    def _casfailed(self, environ, service_url, start_response):

        response = Response('')
        if self._casfailed_url is not None:
            response.status = '302 Moved Temporarily'
            response.headers['Location'] = self._casfailed_url
        else:
            # Default failure notice
            response.status = '401 Unauthorized'
            response.headers['Location'] = self._casfailed_url
            response.headers['Content-Type'] = 'text/plain'
            response.headers['WWW-Authenticate'] = 'CAS casUrl="' + self._root_url + '" service="' + service_url + '"'
            response.data = 'CAS authentication failed\n'
        return response


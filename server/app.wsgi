import sys
import os
sys.path.append(os.path.dirname(__file__))
import wsgi_static

def application(environ, start_response):
    return wsgi_static.application(environ,start_response)

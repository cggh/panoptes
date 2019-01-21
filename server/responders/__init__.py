from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import object
import DQXDbTools
from . import authorization

import sys
import importlib


class Wrapper(object):
    def __init__(self, wrapped):
        self.wrapped = wrapped

    def __getattr__(self, name):
        if name == '__file__':
            raise AttributeError

        module = importlib.import_module('responders.' + name)
        return module

sys.modules['wrappedResponders'] = Wrapper(sys.modules[__name__])

DQXDbTools.DbCredentialVerifier = authorization.CanDo
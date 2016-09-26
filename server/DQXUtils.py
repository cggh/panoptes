# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import time
import os
import re


def LogServer(line):
    print('@@@'+line)


class Timer:
    def __init__(self):
        self.t0=time.time()
        self.t1=time.clock()
    def Elapsed(self):
        return time.time()-self.t0
    def ElapsedCPU(self):
        return time.clock()-self.t1


def GetDQXServerPath():
    return os.path.dirname(os.path.realpath(__file__))


identifierMatcher = re.compile(r"^[^\d\W][\w]*\Z")

#    if not re.match("[_A-Za-z][_a-zA-Z0-9 ]*$", id):

# TODO: this should be moved to Panoptes, as this is app specific
reservedTableNames = ['2D_propertycatalog', '2D_tablecatalog', 'annotation', 'chromosomes', 'externallinks', 'propertycatalog', 'relations', 'settings', 'storedqueries', 'storedsubsets', 'summaryvalues', 'tablebasedsummaryvalues', 'tablecatalog', 'workspaces']

def CheckValidDatabaseIdentifier(id):
    if len(id) == 0:
        raise Exception('Invalid empty identifier')
    if re.match(identifierMatcher, id) is None:
        raise Exception('Invalid identifier: (syntax error) "'+id+'"')

def CheckValidTableIdentifier(id):
    if len(id) == 0:
        raise Exception('Invalid empty identifier')
    if re.match(identifierMatcher, id) is None:
        raise Exception('Invalid identifier: (syntax error) "'+id+'"')
    if id in reservedTableNames:
        raise Exception('Invalid identifier: (reserved name) "' + id+'"')

def CheckValidColumnIdentifier(id):
    if len(id) == 0:
        raise Exception('Invalid empty identifier')
    if re.match(identifierMatcher, id) is None:
        raise Exception('Invalid identifier: (syntax error) "'+id+'"')

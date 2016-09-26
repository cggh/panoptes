# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXbase64
import config

def response(returndata):
    filename=returndata['name']
    #!!!todo: add more integrity checks for the filename
    if filename.find('..')>=0:
        raise Exception('Invalid file name')
    f=open(config.BASEDIR+'/'+filename+'.txt')
    content=f.read()
    f.close()
    returndata['content']=DQXbase64.b64encode_var2(content)
    return returndata

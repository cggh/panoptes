# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from future import standard_library
standard_library.install_aliases()
import DQXbase64
import config
import subprocess

def response(returndata):
    filename=config.BASEDIR+'/'+returndata['name']+'.vcf.gz'
    chrom=returndata['chrom']
    pos=returndata['pos']
    cmd='tabix {0} {1}:{2}-{2}'.format(filename,chrom,pos)
    returndata['cmd']=cmd
    output=subprocess.getstatusoutput(cmd)[1]
    returndata['content']=output
    return returndata

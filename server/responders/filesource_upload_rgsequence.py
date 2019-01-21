from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
from . import authorization
import shutil


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    fileid = DQXDbTools.ToSafeIdentifier(returndata['fileid'])

    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    baseFolder = config.SOURCEDATADIR + '/datasets'

    filename = os.path.join(config.BASEDIR, 'Uploads', DQXDbTools.ToSafeIdentifier(fileid))
    destFolder = os.path.join(baseFolder, databaseName, 'refgenome')

    try:
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        shutil.copyfile(filename, os.path.join(destFolder, 'refsequence.fa'))

        settingsFileName = os.path.join(destFolder, 'settings')
        if not os.path.exists(settingsFileName):
            with open(settingsFileName, 'w') as fp:
                fp.write('AnnotMaxViewPortSize: 750000  # Maximum viewport (in bp) the genome browser can have in order to show the annotation track\n')
                fp.write('RefSequenceSumm: No          # Include a summary track displaying the reference sequence\n')

        chromFileName = os.path.join(destFolder, 'chromosomes')
        if not os.path.exists(chromFileName):
            with open(chromFileName, 'w') as fp:
                fp.write('chrom	length\n')
                fp.write('Chrom_01\t1.54\n')
                fp.write('Chrom_02\t0.85\n')

    except Exception as e:
        returndata['Error'] = str(e)

    os.remove(filename)

    return returndata
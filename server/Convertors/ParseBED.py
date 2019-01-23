from __future__ import print_function
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from DQXTableUtils import VTTable
import sys


basepath = '.'

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
if True:
    basepath = '/Users/pvaut/Documents/Genome/SnpCrossData3'
    sys.argv = ['', 'genomeregions.bed']
#============= END OF FAKE STUFF ============================================


if len(sys.argv)<2:
    print('Usage: COMMAND BEDFileName')
    sys.exit()

sourcefile = sys.argv[1]

tb = VTTable.VTTable()
tb.AddColumn(VTTable.VTColumn('chromid', 'Text'))
tb.AddColumn(VTTable.VTColumn('fstart', 'Value'))
tb.AddColumn(VTTable.VTColumn('fend', 'Value'))
tb.AddColumn(VTTable.VTColumn('fname', 'Text'))
tb.AddColumn(VTTable.VTColumn('fid', 'Text'))
tb.AddColumn(VTTable.VTColumn('ftype', 'Text'))
tb.AddColumn(VTTable.VTColumn('fparentid', 'Text'))
tb.AddColumn(VTTable.VTColumn('fnames', 'Text'))
tb.AddColumn(VTTable.VTColumn('descr', 'Text'))

nr = 0
with open(basepath + '/' + sourcefile, 'r') as fp:
    for line in fp:
        tokens = line.rstrip('\r\n').split('\t')
        print(str(tokens))
        tb.AddRowEmpty()
        tb.SetValue(tb.GetRowCount()-1, 0, tokens[0])
        tb.SetValue(tb.GetRowCount()-1, 1, int(tokens[1]))
        tb.SetValue(tb.GetRowCount()-1, 2, int(tokens[2]))
        tb.SetValue(tb.GetRowCount()-1, 3, tokens[3])
        tb.SetValue(tb.GetRowCount()-1, 4, str(nr))
        tb.SetValue(tb.GetRowCount()-1, 5, 'region')
        tb.SetValue(tb.GetRowCount()-1, 6, '')
        tb.SetValue(tb.GetRowCount()-1, 7, '')
        tb.SetValue(tb.GetRowCount()-1, 8, '')
        nr += 1

tb.PrintRows(0, 9)
tb.SaveSQLCreation(basepath + '/' + sourcefile +'.create.sql', 'regions')
tb.SaveSQLDump(basepath + '/' + sourcefile +'.dump.sql', 'regions')

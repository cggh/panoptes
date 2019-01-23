from __future__ import print_function
from __future__ import division
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import object
from past.utils import old_div
import sys
import os
import simplejson

basedir='.'

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
if False:
    basedir='/home/pvaut/Documents/Genome/Ag'
    sys.argv=['','Anopheles-gambiae-PEST_CHROMOSOMES_AgamP3.fa','acgt', 'X', '150']
#============= END OF FAKE STUFF ============================================

if len(sys.argv)<3:
    print('Usage: COMMAND Sourcefilename countbaselist ignorebaselist halfwinsize')
    print('   Sourcefilename= fasta file')
    sys.exit()

sourcefilename = sys.argv[1]
baselist = sys.argv[2]
ignorebaselist = sys.argv[3]
hwinsize = int(sys.argv[4])



class Handler(object):
    def __init__(self, chromosome, baseliststr, ignorebaseliststr, hwinsize, ofl):
        print('Chrom '+chromosome)
        self.chromosome = chromosome
        self.lastpos=-1
        self.pos = 0
        self.baselist=[base for base in baseliststr]
        self.ignorebaselist=[base for base in ignorebaseliststr]
        print('COUNT: '+str(self.baselist))
        print('IGNORE: '+str(self.ignorebaselist))
        self.hwinsize = hwinsize
        self.curwincent = self.hwinsize
        self.curwinend = 2*self.hwinsize
        self.totct = 0
        self.ct = 0
        self.ofl = ofl


    def Add(self, val):
        while self.pos > self.curwinend:
            self.WriteWindow()
            self.curwincent += 2*self.hwinsize+1
            self.curwinend += 2*self.hwinsize+1
            self.totct = 0
            self.ct = 0
        if val not in self.ignorebaselist:
            self.totct += 1
            if val in self.baselist:
                self.ct += 1
        #print(self.ct)
        self.pos += 1

    def WriteWindow(self):
        if self.totct > 0:
            self.ofl.write('{0}\t{1}\t{2}\n'.format(self.chromosome, self.curwincent, old_div(self.ct*1.0,self.totct)))


    def Finalise(self):
        self.WriteWindow()


ifile=open(basedir+'/'+sourcefilename,'r')

chromoname=''
handler = None

ofl = open(basedir+'/wincount_'+baselist+'.txt','w')

basect = 0
while True:
    line=ifile.readline()
    if not(line):
        break
    line=line.rstrip('\n')
    if line[0]=='>':
        chromoname=line[1:].split(' ')[0]
        if handler != None:
            handler.Finalise()
        handler = Handler(chromoname, baselist, ignorebaselist, hwinsize, ofl)
        print('Reading chromosome {0}'.format(chromoname))
        posit=0
    else:
        for base in line:
            basect += 1
            if basect % 500000 == 0:
                print(str(basect))
            handler.Add(base)

if handler != None:
    handler.Finalise()

ifile.close()
ofl.close()


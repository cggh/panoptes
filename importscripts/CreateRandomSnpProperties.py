from TableUtils import VTTable
import sys
import math
import random


tb = VTTable.VTTable()
tb.allColumnsText=True
tb.LoadFile('/home/pvaut/Documents/Genome/PfPopgen30/snpInfo.tab')
tb.DropCol('Num')
tb.DropCol('Ref')
tb.DropCol('Nonref')
tb.DropCol('GeneId')
tb.DropCol('Strand')
tb.DropCol('CodonNum')
tb.DropCol('Codon')
tb.DropCol('NtPos')
tb.DropCol('RefAmino')
tb.DropCol('Mutation')
tb.DropCol('MutCodon')
tb.DropCol('MutAmino')
tb.DropCol('MutType')
tb.DropCol('MutName')
tb.DropCol('GeneDescription')
tb.ConvertColToValue('Pos')
tb.RenameCol('Chr','chrom')
tb.RenameCol('Pos','pos')
tb.RenameCol('SnpName','snpid')
#tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_create.sql','snpinfo')

alphabet="abcdefghijklmnopqrstuvwxyz"

def RandomString():
    length = int(1+random.random()*15)
    st = ''
    for i in range(length):
        st += alphabet[int(random.random()*len(alphabet))]
    return st;


if True:
    for propnr in range(5):
        propname='prop'+str(propnr)
        tb.AddColumn(VTTable.VTColumn(propname,'Value'))
        tb.FillColumn(propname,0)
        propcolnr=tb.GetColNr(propname)
        ampl = 0.005+0.02*random.random()
        phase = random.random()*2*math.pi
        for rownr in tb.GetRowNrRange():
            pos = tb.GetValue(rownr,1)
            tb.SetValue(rownr,propcolnr,0.5+0.5*math.sin(ampl*pos+phase)+random.random()*0.1)
        filename='SnpProps_Values'


if False:
    for propnr in range(3):
        propname='TextProp'+str(propnr)
        tb.AddColumn(VTTable.VTColumn(propname,'Text'))
        tb.FillColumn(propname,'')
        propcolnr=tb.GetColNr(propname)
        for rownr in tb.GetRowNrRange():
            tb.SetValue(rownr,propcolnr,RandomString())
        filename='SnpProps_Text'

if False:
    for propnr in range(3):
        propname='CatProp'+str(propnr)
        tb.AddColumn(VTTable.VTColumn(propname,'Text'))
        tb.FillColumn(propname,'')
        propcolnr=tb.GetColNr(propname)
        catcount = 3
        cat = ['Cat_{0}_{1}'.format(str(propnr),alphabet[i]) for i in range(catcount)]
        for rownr in tb.GetRowNrRange():
            tb.SetValue(rownr,propcolnr,cat[int(random.random()*catcount)])
        filename='SnpProps_Text'



tb.DropCol('chrom')
tb.DropCol('pos')


tb.PrintRows(0,10)



tb.SaveFile('/home/pvaut/Documents/Genome/PfPopgen30/{0}.txt'.format(filename))
tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/{0}_create.sql'.format(filename),filename)
tb.SaveSQLDump('/home/pvaut/Documents/Genome/PfPopgen30/{0}_dump.sql'.format(filename),filename)
sys.exit()

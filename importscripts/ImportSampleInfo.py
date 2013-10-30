from TableUtils import VTTable
import sys


def replaceNA(vl):
    if vl=='#N/A':
        return None
    else:
        return vl

def boolToVal(vl):
    if vl=='TRUE':
        return 1
    else:
        return 0



tb = VTTable.VTTable()
tb.allColumnsText=True
#tb.sepchar = ','
tb.LoadFile('/home/pvaut/Documents/Genome/PfPopgen21/metadata-2.2_withsites.txt')
#tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_create.sql','snpinfo')

tb.DropCol('dummy')


i=0
while i < tb.GetRowCount():
    sampleid = tb.GetValue(i,0)
    if sampleid.find(' ') >= 0:
        tb.RemoveRow(i)
    else:
        i += 1

for colname in tb.GetColList():
    tb.MapCol(colname, replaceNA)


tb.RenameCol('Sample','sampleid')
tb.DropCol('Num')
#tb.DropCol('Site')
#tb.DropCol('SiteInfoSource')
#tb.DropCol('SiteCodeOriginal')
#tb.DropCol('Notes')
tb.DropCol('ManualExlusion')

tb.ConvertColToValue('Fws')
tb.ConvertColToValue('Typability')

tb.MapCol('LabSample', boolToVal)
tb.ConvertColToValue('LabSample')
tb.MapCol('LowTypability', boolToVal)
tb.ConvertColToValue('LowTypability')
tb.MapCol('PcaOutlier', boolToVal)
tb.ConvertColToValue('PcaOutlier')
tb.MapCol('IsDuplicate', boolToVal)
tb.ConvertColToValue('IsDuplicate')
tb.MapCol('Exclude', boolToVal)
tb.ConvertColToValue('Exclude')
tb.MapCol('UsedInSnpDiscovery', boolToVal)
tb.ConvertColToValue('UsedInSnpDiscovery')


if True:
    tb2 = VTTable.VTTable()
    tb2.CopyFrom(tb)
    tb2.DropCol('PcaOutlier')
    tb2.DropCol('Exclude')
    tb2.DropCol('Fws')
    tb2.DropCol('Region')
    tb2.DropCol('KhCluster')
    tb2.DropCol('SubCont')


    tb2.PrintRows(0,15)
    tb2.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/samples_create.sql','SMP')
    tb2.SaveSQLDump('/home/pvaut/Documents/Genome/PfPopgen30/samples_dump.sql','SMP')


tb2 = VTTable.VTTable()
tb2.CopyFrom(tb)
tb2.DropCol('Study')
tb2.DropCol('Country')
tb2.DropCol('LabSample')
tb2.DropCol('LowTypability')
tb2.DropCol('IsDuplicate')
tb2.DropCol('Typability')
tb2.DropCol('UsedInSnpDiscovery')
tb2.DropCol('Location')
tb2.DropCol('Year')
tb2.DropCol('SiteCode')
tb2.PrintRows(0,150000)
tb2.SaveFile('/home/pvaut/Documents/Genome/PfPopgen30/SampleProps.txt')

#sys.exit()

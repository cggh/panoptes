from TableUtils import VTTable
import sys


tb = VTTable.VTTable()
tb.allColumnsText=True
tb.LoadFile('/Users/pvaut/Documents/Data/Genome/PGV30/snpInfo.tab')
#tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_create.sql','snpinfo')


tb.ConvertColToValue('Pos')


#tb.MapCol('CodonNum', convertdashtoabsent)
tb.ConvertColToValue('CodonNum')

tb.ConvertColToValue('NtPos')


tb.ConvertColToValue('Num')

tb.RenameCol('Chr','chrom')
tb.RenameCol('Pos','pos')
tb.RenameCol('SnpName','snpid')

tb.PrintRows(0,15)

tb.SaveSQLCreation('/Users/pvaut/Documents/Data/Genome/PGV30/snpinfo_create.sql','SNP')
tb.SaveSQLDump('/Users/pvaut/Documents/Data/Genome/PGV30/snpinfo_dump.sql','SNP')
sys.exit()

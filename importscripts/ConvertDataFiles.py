from TableUtils import VTTable
import sys


files=[
    "ART.IC50",
    "CQ.IC50",
    "DHA.IC50",
    "MQ.IC50",
    "PPQ.IC50",
    "QN.IC50"
]
folder = "/Users/pvaut/Documents/Data/Genome/PGV30/KH-GWAS"
filext = "_EMMA_pgva3_MAFge05_TYPgt80_WebApp.txt"
colprefix='KH-GWAS-'

for file in files:
    colname = colprefix+file
    colname=colname.replace('.','_')
    colname=colname.replace('-','_')
    tb = VTTable.VTTable()
    tb.allColumnsText=True
    tb.LoadFile(folder+'/'+file+filext)
    tb.RenameCol('value',colname)
    tb.CalcCol("snpid",
                lambda x,y: x+':'+y,
                "chrom",'pos')
    tb.DropCol('chrom')
    tb.DropCol('pos')
    tb.ArrangeColumns(['snpid'])
    tb.PrintRows(0,15)
    tb.saveheadertype=False
    tb.SaveFile(folder+'/'+colname+".txt")


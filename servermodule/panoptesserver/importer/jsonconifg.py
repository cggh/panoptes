from os import path, listdir
from os.path import join
from simplejson import loads
from Bio import SeqIO
from PanoptesConfig import PanoptesConfig
from SettingsGlobal import SettingsGlobal
from SettingsDataTable import SettingsDataTable
from Settings2Dtable import Settings2Dtable


config = PanoptesConfig(None)
baseFolder = join(config.getSourceDataDir(), 'datasets')

def readSetOfSettings(dirPath, loader, wanted_names):
    if not path.isdir(dirPath):
        return {}
    return {name: loads(loader(join(dirPath, name, 'settings'), validate=True).serialize())
                 for name in listdir(dirPath)
                  if path.isdir(join(dirPath, name)) and (not wanted_names or name in wanted_names)}

def readJSONConfig(datasetId):
    datasetFolder = join(baseFolder, datasetId)
    settingsFile = join(datasetFolder, 'settings')
    globalSettings = loads(SettingsGlobal(settingsFile, validate=True).serialize())
    with open(join(datasetFolder, 'refgenome', 'refsequence.fa')) as fastaFile:
        chromosomes = {fasta.id: len(fasta.seq) for fasta in SeqIO.parse(fastaFile, 'fasta')}
    tableSettings = readSetOfSettings(join(datasetFolder, 'datatables'), SettingsDataTable, globalSettings.get('DataTables'))
    twoDSettings = readSetOfSettings(join(datasetFolder, '2D_datatables'), Settings2Dtable, globalSettings.get('2D_DataTables'))


readJSONConfig('Genotypes')
readJSONConfig('Samples_and_Variants')
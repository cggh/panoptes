from os import path, listdir
from os.path import join
from simplejson import loads, dumps
from Bio import SeqIO
from PanoptesConfig import PanoptesConfig
from SettingsDataset import SettingsDataset
from SettingsDataTable import SettingsDataTable
from Settings2Dtable import Settings2Dtable
from SettingsRefGenome import SettingsRefGenome

config = PanoptesConfig(None)
baseFolder = join(config.getSourceDataDir(), 'datasets')

def readSetOfSettings(dirPath, loader, wanted_names=None):
    if not path.isdir(dirPath):
        return {}
    return {name: loads(loader(join(dirPath, name, 'settings'), validate=True).serialize())
                 for name in listdir(dirPath)
                  if path.isdir(join(dirPath, name)) and (not wanted_names or name in wanted_names)}


def readJSONConfig(datasetId):
    datasetFolder = join(baseFolder, datasetId)
    settingsFile = join(datasetFolder, 'settings')
    settings = loads(SettingsDataset(settingsFile, validate=True).serialize())
    with open(join(datasetFolder, 'refgenome', 'refsequence.fa')) as fastaFile:
        chromosomes = {fasta.id: len(fasta.seq) for fasta in SeqIO.parse(fastaFile, 'fasta')}
    tables = readSetOfSettings(join(datasetFolder, 'datatables'), SettingsDataTable, settings.get('DataTables'))
    twoDTables = readSetOfSettings(join(datasetFolder, '2D_datatables'), Settings2Dtable, settings.get('2D_DataTables'))
    genome = loads(SettingsRefGenome(join(datasetFolder, 'refgenome', 'settings'), validate=True).serialize())
    genome['summaryValues'] = readSetOfSettings(join(datasetFolder, 'refgenome', 'summaryvalues'), SettingsDataTable)
    return {
        'settings': settings,
        'chromosomes': chromosomes,
        'tablesById': tables,
        'twoDTablesById': twoDTables,
        'genome': genome
    }

class ReadOnlyErrorWriter:
    def __init__(self, name):
        self.name = name
    def updateAndWriteBack(self, action, updatePath, newConfig, validate=True):
        raise Exception("The config at:"+'.'.join([self.name]+updatePath)+" is read-only")

def writeJSONConfig(datasetId, action, path, newConfig):
    datasetFolder = join(baseFolder, datasetId)
    settingsFile = join(datasetFolder, 'settings')
    #We have a path in the combined JSON object - we now follow the path until we hit a subset confined to one YAML handler
    writers = {
        'settings': lambda path: (path, SettingsGlobal(settingsFile, validate=True)),
        'chromosomes': lambda path: (path, ReadOnlyErrorWriter('chromosomes')),
        'genome': lambda path: (path, ReadOnlyErrorWriter('genome')), #For now as this will likely get a refactor
        'tablesById': lambda path: (path[1:], SettingsDataTable(join(datasetFolder, 'datatables', path[0], 'settings'), validate=True)),
        'twoDTablesById': lambda path: (path[1:], SettingsDataTable(join(datasetFolder, '2D_datatables', path[0], 'settings'), validate=True)),
    }
    path = path.split('.')
    (path, writer) = writers[path[0]](path[1:])
    writer.updateAndWriteBack(action, path, newConfig, validate=True)
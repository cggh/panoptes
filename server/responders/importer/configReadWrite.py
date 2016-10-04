from os import path, listdir
from os.path import join

from os.path import exists
from simplejson import load, loads, dumps
from PanoptesConfig import PanoptesConfig
from SettingsDataset import SettingsDataset
from SettingsDataTable import SettingsDataTable
from Settings2Dtable import Settings2Dtable
from SettingsRefGenome import SettingsRefGenome
from SettingsMapLayer import SettingsMapLayer
from readChromLengths import readChromLengths

config = PanoptesConfig(None)
sourceDir = join(config.getSourceDataDir(), 'datasets')
baseDir = config.getBaseDir()


def readSetOfSettings(dirPath, loader, wanted_names=None):
    if not path.isdir(dirPath):
        return {}
    return {name: loads(loader(join(dirPath, name, 'settings'), validate=True).serialize())
                 for name in listdir(dirPath)
                  if path.isdir(join(dirPath, name)) and (not wanted_names or name in wanted_names)}


def readJSONConfig(datasetId):
    dataset_folder = join(sourceDir, datasetId)
    base_folder = join(baseDir, 'config', datasetId)
    if not path.isdir(dataset_folder):
        raise Exception('Error: ' + datasetId + ' is not a known dataset in the source directory')
    settings_file = join(dataset_folder, 'settings')
    settings = loads(SettingsDataset(settings_file, validate=True).serialize())
    try:
        with open(join(base_folder, 'chromosomes.json'), 'r') as f:
            chromosomes = load(f)
    except IOError:
        print('Cached chrom config not found - scanning')
        chromosomes = readChromLengths(join(dataset_folder, 'refgenome', 'refsequence.fa'))

    tables = readSetOfSettings(join(dataset_folder, 'datatables'), SettingsDataTable, settings.get('DataTables'))
    try:
        for tableId, table_config in tables.items():
            config_file = join(base_folder, tableId, 'dataConfig.json')
            print(config_file)
            if exists(config_file):
                with open(config_file, 'r') as f:
                    data_config = load(f)
                    for prop in table_config['properties']:
                        if prop['id'] in data_config:
                            for key, value in data_config[prop['id']].items():
                                if key not in prop:
                                    prop[key] = value

    except IOError:
        print('Cached data derived config not found - skipping')
    twoDTables = readSetOfSettings(join(dataset_folder, '2D_datatables'), Settings2Dtable, settings.get('2D_DataTables'))
    genome = loads(SettingsRefGenome(join(dataset_folder, 'refgenome', 'settings'), validate=True).serialize())
    mapLayers = readSetOfSettings(join(dataset_folder, 'maps'), SettingsMapLayer)
    return {
        'settings': settings,
        'chromosomes': chromosomes,
        'tablesById': tables,
        'twoDTablesById': twoDTables,
        'genome': genome,
        'mapLayers': mapLayers
    }

class ReadOnlyErrorWriter:
    def __init__(self, name):
        self.name = name
    def updateAndWriteBack(self, action, updatePath, newConfig, validate=True):
        raise Exception("The config at:"+'.'.join([self.name]+updatePath)+" is read-only")

def writeJSONConfig(datasetId, action, path, newConfig):
    dataset_folder = join(sourceDir, datasetId)
    settings_file = join(dataset_folder, 'settings')
    #We have a path in the combined JSON object - we now follow the path until we hit a subset confined to one YAML handler
    writers = {
        'settings': lambda path: (path, SettingsDataset(settings_file, validate=True)),
        'chromosomes': lambda path: (path, ReadOnlyErrorWriter('chromosomes')),
        'genome': lambda path: (path, ReadOnlyErrorWriter('genome')), #For now as this will likely get a refactor
        'mapLayers': lambda path: (path, ReadOnlyErrorWriter('mapLayers')),  # For now as this will likely get a refactor
        'tablesById': lambda path: (path[1:], SettingsDataTable(join(dataset_folder, 'datatables', path[0], 'settings'), validate=True)),
        'twoDTablesById': lambda path: (path[1:], SettingsDataTable(join(dataset_folder, '2D_datatables', path[0], 'settings'), validate=True)),
    }
    path = path.split('.')
    (path, writer) = writers[path[0]](path[1:])
    writer.updateAndWriteBack(action, path, newConfig, validate=True)
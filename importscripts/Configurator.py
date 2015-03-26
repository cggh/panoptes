import logging;
import datetime
import yaml
import decimal
import math
import os
from distutils.command.config import config

class Configurator(object):
    
    def __init__(self):
        self._separator = '\t'
    
    def _parseHeader(self, header):
        self._fileColNames = [colname.replace(' ', '_') for colname in header.rstrip('\n').split(self._separator)]
        self._fileColIndex = {self._fileColNames[i]: i for i in range(len(self._fileColNames))}
        
        config = {}
        values = {}
        
        for conf in self._fileColNames:
            config[conf] = {}
            config[conf]['Id'] = conf
            config[conf]['Name'] = conf
            values[conf] = []
        
        return config, values

    def getColumnNames(self):
        return self._fileColNames
        
    def _parseLine(self, line, config, values, fileName):
        
        sourceCells = line.split(self._separator)
        
        i = 0
        for content in sourceCells:

            name = self._fileColNames[i]
            idx = name
            
            config[idx]['MaxLen'] = max(config[idx].get('MaxLen', 0), len(content))

            #This isn't the quickest but is convenient and sometimes can't tell whether int or str (00000007 and 00000008) 
            #http://pythonhosted.org//fastnumbers/fast.html#fast-real for speed
            parsed = yaml.load(content)
            
            dataType = 'Text'
            if type(parsed) is float:
                dataType = 'Value'
                config[idx]['DecimDigits'] = max(config[idx].get('DecimDigits',0), abs(decimal.Decimal(content).as_tuple().exponent))
            elif type(parsed) is int:
                dataType = 'Value'
                config[idx]['DecimDigits'] = max(config[idx].get('DecimDigits',0), 0)
            elif type(parsed) is bool:
                dataType = 'Boolean'
            elif content == '':
                #Special Case
                #Keep the same data type as for other rows
                if 'DataType' in config[idx]:
                    dataType = config[idx]['DataType']
                    #Treat '' as 0 for valued columns
                    if dataType == 'Value':
                        parsed = 0
                        if not content in values[idx]:
                            values[idx].append(content)
            elif type(parsed) is str or type(parsed) is list or parsed is None or type(parsed) is dict:
                dataType = 'Text'
                #If you use True/False then the True doesn't appear in the output
                cate = config[idx].get('IsCategorical','true')
                if cate == 'true':
                    if not 'IsCategorical' in config[idx]:
                        config[idx]['IsCategorical'] = 'true'
                    if not content in values[idx]:
                        values[idx].append(content)
                        if len(values[idx]) > 12:
                            config[idx]['IsCategorical'] = 'false'
            elif type(parsed) is datetime.date:
                dataType = 'Date'
            else:
                logging.error("Unrecognised type for %s:%s:%s: in %s" % (str(name),str(type(parsed)),content, fileName))   
                

            #Probably an id
            if content.startswith('000'):
                dataType = 'Text'
                if dataType == 'Value':
                    del config[idx]['DecimDigits']
                
            if dataType == 'Value' and 'lat' in name.lower() and parsed > -90 and parsed < 90:
                dataType = 'GeoLattitude'
                del config[idx]['DecimDigits']
                
            if dataType == 'Value' and 'long' in name.lower() and parsed > -180 and parsed < 180:
                dataType = 'GeoLongitude'
                del config[idx]['DecimDigits']
                   
            if config[idx].get('DataType',dataType) != dataType:
                if parsed is None:
                    dataType = config[idx]['DataType']
                else:
                    logging.warn("Mixed content type for %s:%s:%s: previously %s" % (str(name),dataType,content,config[idx]['DataType']))
                    if config[idx]['DataType'] == 'Value':
                        del config[idx]['DecimDigits']
                        del config[idx]['MaxVal']
                        del config[idx]['MinVal']
                    
            config[idx]['DataType'] = dataType
                
            if dataType == 'Value' and not parsed is None:
                max_val = math.ceil(float(parsed))
                min_val = math.floor(float(parsed))
                config[idx]['MaxVal'] = max(config[idx].get('MaxVal',0), max_val)
                config[idx]['MinVal'] = min(config[idx].get('MinVal',0), min_val)
      
            i = i + 1
    
    def processFile(self, sourceFileName):
        
        rootProps = {}
        with open(sourceFileName, 'r') as ifp:
            if ifp is None:
                raise Exception('Unable to read file '+sourceFileName)
                
            header = ifp.readline()
            header = header.rstrip('\n')
            header = header.rstrip('\r')
            config, values = self._parseHeader(header)
            
            lineCount = 1
            for line in ifp:
                try:
                      
                    line = line.rstrip('\n')
                    line = line.rstrip('\r')
                    
                    if len(line) > 0:
                        self._parseLine(line, config, values, sourceFileName)

                except Exception as e:
                    logging.error('Offending line: ' + line)
                    raise Exception('Error while parsing line {0} of file "{1}": {2}'.format(
                                                                                             lineCount + 1,
                                                                                             sourceFileName,
                                                                                             str(e)))
                    
                lineCount = lineCount + 1
                if lineCount > 100000:
                    break
                        
               
            rootProps = {
             'NameSingle': os.path.basename(os.path.dirname(sourceFileName)),
             'NamePlural': os.path.basename(os.path.dirname(sourceFileName)),
             'Description': 'Default description',
             'PrimKey': 'AutoKey'
            }
            for conf in config:
                if 'DataType' in config[conf] and config[conf]['DataType'] == 'Value':
                    if len(values[conf]) > 0:
                        config[conf]['StringValues'] = values[conf]
                if config[conf]['Id'].lower().startswith('pos'):
                    rootProps['Position'] = config[conf]['Id']
                    rootProps['IsPositionOnGenome'] = 'true'
                if config[conf]['Id'].lower().startswith('chr'):
                    rootProps['Chromosome'] = config[conf]['Id']
                    rootProps['IsPositionOnGenome'] = 'true'
             
            if lineCount == 1:
                rootProps = {
                 'Name': os.path.basename(os.path.dirname(sourceFileName)),
                 'Format': 'newick',
                 'Description': 'Sample Description',
                 'CrossLink': 'unknown'
                }
                config = {}
                
            return rootProps, config
                    
        
    
    def processSamples(self, samplesDir):
        
        for dirName, subdirList, fileList in os.walk(samplesDir):
            if len(fileList) > 0:
                #Assume all the same so only process one
                sourceFileName = os.path.join(dirName,fileList[0])
                rootProps, config = configurator.processFile(sourceFileName)
                #Two types of configuration available
                if len(config) == 3:
                    #Old style - no header - 3 columns chrom, pos, value
                    #Id = directory Name
                    key = self._fileColNames[len(self._fileColNames) - 1]
                    config[key]["Id"] = os.path.basename(dirName)
                    config[key]["Name"] = os.path.basename(dirName)
                    conf = config[key]
                    config = [ conf ]
                else:
                    #New style - header, as per normal data file
                    #Id = column name
                    #Directory name in FilePattern
                    conf = []
                    for key in config:
                        config[key]["FilePattern"] = os.path.basename(dirName) + "/*"
                        conf.append(config[key])
                    config = conf
                return config
        
    def output(self, outfile, config):
        with open(outfile, 'w') as of:
            yaml.dump(config, of, default_flow_style=False)
        #print yaml.dump(config, default_flow_style=False)
                                
if __name__ == "__main__":
    
    import config
    startDir = config.SOURCEDATADIR + '/datasets'
    #startDir = "/vagrant/panoptes/current/sampledata/datasets/Samples_and_Variants/datatables/samples"
    for dirName, subdirList, fileList in os.walk(startDir):
        
        if 'data' in fileList:
            configurator = Configurator()
            config = {}
            config["Properties"] = []
            rootProps, props = configurator.processFile(os.path.join(dirName,'data'))
            config.update(rootProps)
            for key in configurator.getColumnNames():
                value = props[key]
                config["Properties"].append(value)
#            for key, value in props.iteritems():
#                config["Properties"].append(value)
            if len(subdirList) > 0:
                for sampleDir in subdirList:
                    if sampleDir != 'graphs':
                        tbsv = configurator.processSamples(os.path.join(dirName,sampleDir))
                        if "TableBasedSummaryValues" in config and config["TableBasedSummaryValues"]:
                            config["TableBasedSummaryValues"].append(tbsv)
                        else:
                            config["TableBasedSummaryValues"] = tbsv
            
            configurator.output(os.path.join(dirName,'settings.gen'), config)
            
    

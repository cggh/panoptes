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
        
    def _parseLine(self, line, config, values):
        
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
            elif type(parsed) is str or type(parsed) is list:
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
            elif content == '':
                #Keep the same data type as for other rows
                if 'DataType' in config[idx]:
                    dataType = config[idx]['DataType']
                    #Treat '' as 0 for valued columns
                    if dataType == 'Value':
                        parsed = 0
            else:
                logging.error("Unrecognised type for %s:%s:%s:" % (str(name),str(type(parsed)),content))   
                

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
                logging.warn("Mixed content type for %s:%s:%s: previously %s" % (str(name),dataType,content,config[idx]['DataType']))
                if config[idx]['DataType'] == 'Value':
                    del config[idx]['DecimDigits']
                    del config[idx]['MaxVal']
                    del config[idx]['MinVal']
                    
            config[idx]['DataType'] = dataType
                
            if dataType == 'Value':
                max_val = math.ceil(float(parsed))
                min_val = math.floor(float(parsed))
                config[idx]['MaxVal'] = max(config[idx].get('MaxVal',0), max_val)
                config[idx]['MinVal'] = min(config[idx].get('MinVal',0), min_val)
      
            i = i + 1
    
    def processFile(self, sourceFileName):
        
        
        with open(sourceFileName, 'r') as ifp:
            if ifp is None:
                raise Exception('Unable to read file '+sourceFileName)
                
            header = ifp.readline()
            header = header.rstrip('\n')
            config, values = self._parseHeader(header)
            
            lineCount = 1
            for line in ifp:
                try:
                      
                    line = line.rstrip('\n')
                    if len(line) > 0:
                        self._parseLine(line, config, values)
                        
                except Exception as e:
                    logging.error('Offending line: ' + line)
                    raise Exception('Error while parsing line {0} of file "{1}": {2}'.format(
                                                                                             lineCount + 1,
                                                                                             sourceFileName,
                                                                                             str(e)))
                    
                lineCount = lineCount + 1
                
            return config
                    
        
    
    def processSamples(self, samplesDir):
        
        for dirName, subdirList, fileList in os.walk(samplesDir):
            if len(fileList) > 0:
                #Assume all the same so only process one
                sourceFileName = os.path.join(dirName,fileList[0])
                config = configurator.processFile(sourceFileName)
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
    #startDir = "/vagrant/panoptes/current/sampledata/datasets/"
    for dirName, subdirList, fileList in os.walk(startDir):
        
        if 'data' in fileList:
            configurator = Configurator()
            config = {}
            config["Properties"] = []
            props = configurator.processFile(os.path.join(dirName,'data'))
            for key, value in props.iteritems():
                config["Properties"].append(value)
            if len(subdirList) > 0:
                for sampleDir in subdirList:
                    if sampleDir != 'graphs':
                        tbsv = configurator.processSamples(os.path.join(dirName,sampleDir))
                        if "TableBasedSummaryValues" in config:
                            config["TableBasedSummaryValues"].update(tbsv)
                        else:
                            config["TableBasedSummaryValues"] = tbsv
            
            configurator.output(os.path.join(dirName,'settings.gen'), config)
            
    
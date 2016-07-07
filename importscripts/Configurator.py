import logging
import datetime
import yaml
import decimal
import math
import os
from distutils.command.config import config
from collections import OrderedDict

class Configurator(object):
    
    def __init__(self):
        self._separator = '\t'
        self._definitions = {}
    
    def _parseHeader(self, header):
        self._fileColNames = [colname.replace(' ', '_') for colname in header.rstrip('\n').split(self._separator)]
        self._fileColIndex = {self._fileColNames[i]: i for i in range(len(self._fileColNames))}
        
        config = {}
        values = {}
       
        #Need to ignore trees
        if len(self._fileColNames) == 1 and '(' in header:
            print 'Probably not a data table file. Header is:' + header
            self._fileColNames = []
            self._fileColIndex = {}
            return config, values
 
        for conf in self._fileColNames:
            config[conf] = {}
            config[conf]['id'] = conf
            config[conf]['name'] = conf
            values[conf] = []
        
        return config, values

    def getColumnNames(self):
        return self._fileColNames
        
    def _parseLine(self, line, config, values, fileName, lineCount):
        
        sourceCells = line.split(self._separator)
        
        i = 0
        for content in sourceCells:

            name = self._fileColNames[i]
            i = i + 1
            idx = name
            
            config[idx]['maxLen'] = max(config[idx].get('maxLen', 0), len(content))

            #It's just too slow....
            if lineCount > 10000 and 'dataType' in config[idx]:
                if config[idx]['dataType'] == 'value' and config[idx]['decimDigits'] > 0 and '.' in content:
                    config[idx]['decimDigits'] = max(config[idx].get('decimDigits',0), abs(decimal.Decimal(content).as_tuple().exponent))
                continue

            if content == '':
                #Special Case
                #Keep the same data type as for other rows
                continue
            
            #This isn't the quickest but is convenient and sometimes can't tell whether int or str (00000007 and 00000008) 
            #http://pythonhosted.org//fastnumbers/fast.html#fast-real for speed
            parsed = yaml.load(content)
            
            dataType = 'Text'
            if type(parsed) is float:
                dataType = 'Value'
                config[idx]['decimDigits'] = max(config[idx].get('decimDigits',0), abs(decimal.Decimal(content).as_tuple().exponent))
            elif type(parsed) is int:
                dataType = 'Value'
                config[idx]['decimDigits'] = max(config[idx].get('decimDigits',0), 0)
            elif type(parsed) is bool:
                dataType = 'Boolean'
            elif type(parsed) is str or type(parsed) is list or parsed is None or type(parsed) is dict:
                dataType = 'Text'
                #If you use True/False then the True doesn't appear in the output
                cate = config[idx].get('isCategorical','true')
                if cate == 'true':
                    if not 'isCategorical' in config[idx]:
                        config[idx]['isCategorical'] = 'true'
                    if not content in values[idx]:
                        values[idx].append(content)
                        if len(values[idx]) > 12:
                            config[idx]['isCategorical'] = 'false'
            elif type(parsed) is datetime.date:
                dataType = 'Date'
            else:
                logging.error("Unrecognised type for %s:%s:%s: in %s" % (str(name),str(type(parsed)),content, fileName))   
                

            #Probably an id
            if content.startswith('000'):
                dataType = 'Text'
                if dataType == 'Value':
                    del config[idx]['decimDigits']
                
            if dataType == 'Value' and 'lat' in name.lower() and parsed > -90 and parsed < 90:
                dataType = 'GeoLatitude'
                del config[idx]['decimDigits']
                
            if dataType == 'Value' and 'long' in name.lower() and parsed > -180 and parsed < 180:
                dataType = 'GeoLongitude'
                del config[idx]['decimDigits']
                   
            if config[idx].get('dataType',dataType) != dataType:
#                if parsed is None:
#                    dataType = config[idx]['dataType']
#                else:
                    logging.warn("Mixed content type for %s:%s:%s(%s): previously %s from %s" % (str(name),dataType,content,str(type(parsed)),config[idx]['dataType'], self._definitions.get(idx,'')))
        	    self._definitions[idx] = content
                    if config[idx]['dataType'] == 'Value':
                        del config[idx]['decimDigits']
                        del config[idx]['maxVal']
                        del config[idx]['minVal']
                    
            config[idx]['dataType'] = dataType
                
            if dataType == 'Value' and not parsed is None:
                max_val = math.ceil(float(parsed))
                min_val = math.floor(float(parsed))
                config[idx]['maxVal'] = max(config[idx].get('maxVal',0), max_val)
                config[idx]['minVal'] = min(config[idx].get('minVal',0), min_val)
      
    
    def processFile(self, sourceFileName):
        
        rootProps = {}
        logging.warn("Parsing %s" % (sourceFileName))
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
                        self._parseLine(line, config, values, sourceFileName, lineCount)

                except Exception as e:
                    logging.error('Offending line: ' + line)
                    raise Exception('Error while parsing line {0} of file "{1}": {2}'.format(
                                                                                             lineCount + 1,
                                                                                             sourceFileName,
                                                                                             str(e)))
                    
                lineCount = lineCount + 1

                if lineCount % 1000000 == 0:
                    print "Processed {} lines".format(lineCount)
                        
               
            rootProps = OrderedDict((
             ('nameSingle', os.path.basename(os.path.dirname(sourceFileName))),
             ('namePlural', os.path.basename(os.path.dirname(sourceFileName))),
             ('description', 'Default description'),
             ('primKey', 'AutoKey')
            ))
            for conf in config:
                if 'dataType' in config[conf] and config[conf]['dataType'] == 'Value':
                    if len(values[conf]) > 0:
                        config[conf]['stringValues'] = values[conf]
                if config[conf]['id'].lower().startswith('pos'):
                    rootProps['position'] = config[conf]['id']
                    rootProps['isPositionOnGenome'] = 'true'
                if config[conf]['id'].lower().startswith('chr'):
                    rootProps['chromosome'] = config[conf]['id']
                    rootProps['isPositionOnGenome'] = 'true'
             
            if lineCount == 1:
                rootProps = {
                 'name': os.path.basename(os.path.dirname(sourceFileName)),
                 'format': 'newick',
                 'description': 'sample Description',
                 'crossLink': 'unknown'
                }
                config = {}
                
            return rootProps, config, values
                    
        
    
    def processSamples(self, samplesDir):
        
        for dirName, subdirList, fileList in os.walk(samplesDir):
            if len(fileList) > 0:
                #Assume all the same so only process one
                sourceFileName = os.path.join(dirName,fileList[0])
                rootProps, config, values = configurator.processFile(sourceFileName)
                #Two types of configuration available
                if len(config) == 3:
                    #Old style - no header - 3 columns chrom, pos, value
                    #Id = directory Name
                    key = self._fileColNames[len(self._fileColNames) - 1]
                    config[key]["id"] = os.path.basename(dirName)
                    config[key]["name"] = os.path.basename(dirName)
                    conf = config[key]
                    config = [ conf ]
                else:
                    #New style - header, as per normal data file
                    #Id = column name
                    #Directory name in FilePattern
                    conf = []
                    for key in config:
                        config[key]["filePattern"] = os.path.basename(dirName) + "/*"
                        conf.append(config[key])
                    config = conf
                return config
        
    def output(self, outfile, config):
        with open(outfile, 'w') as of:
            print >>of, "#Warning for large data files MaxVal, MinVal and Categories may not be correct"
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
            config["properties"] = []
            rootProps, props, values = configurator.processFile(os.path.join(dirName,'data'))
            config.update(rootProps)
            for key in configurator.getColumnNames():
                value = props[key]
                if 'isCategorical' in value and value['isCategorical'] == 'true':
                    value['categories'] = values[key]
                config["properties"].append(value)
#            for key, value in props.iteritems():
#                config["properties"].append(value)
            if len(subdirList) > 0:
                for sampleDir in subdirList:
                    if sampleDir != 'graphs':
                        tbsv = configurator.processSamples(os.path.join(dirName,sampleDir))
                        if "tableBasedSummaryValues" in config and config["tableBasedSummaryValues"]:
                            config["tableBasedSummaryValues"].append(tbsv)
                        else:
                            config["tableBasedSummaryValues"] = tbsv
            
            configurator.output(os.path.join(dirName,'settings.gen'), config)
            
    

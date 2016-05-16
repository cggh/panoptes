import unittest
import os
from SettingsDataTable import SettingsDataTable
import simplejson
from Settings2Dtable import Settings2Dtable
from SettingsRefGenome import SettingsRefGenome
from SettingsWorkspace import SettingsWorkspace
from SettingsGraph import SettingsGraph
from SettingsSummary import SettingsSummary
from SettingsCustomData import SettingsCustomData

''' Not doing it anymore....
	def testConvertBoolean(self):
	
		valuest = [ "true", "yes", "y", "1", 1]
		valuesf = [ "false", "no", "n", "0", 0 ]
		
		testProps = self._testProps
		testProps['Properties'][0]['IsCategorical'] = False
		for val in valuest:
			settingsLoaded = SettingsDataTable()
			testProps['Properties'][0]['IsCategorical'] = val
			settingsLoaded.loadProps(testProps)
			loaded = settingsLoaded.getPropertyValue('Test',"IsCategorical")
			self.assertIs(type(loaded), bool)
			self.assertTrue(loaded)

			
		for val in valuesf:
			settingsLoaded = SettingsDataTable()
			testProps['Properties'][0]['IsCategorical'] = val
			settingsLoaded.loadProps(testProps)
			self.assertIs(type(settingsLoaded.getPropertyValue('Test',"IsCategorical")), bool)
			self.assertFalse(settingsLoaded.getPropertyValue('Test',"IsCategorical"))
'''

class ImportSettingsTest(unittest.TestCase):

	def setUp(self):
		self._testProps = { 'NameSingle': '',
						'NamePlural': '',
						'PrimKey': 'Test',
						'SortDefault': 'Test',
						'Description': '',
						'Properties': [{"Id": "Test",
										"Name": "Test",
										"DataType": "Text"
										},
										{"Id": "TestA",
										"Name": "TestA",
										"DataType": "Value"
										}]}
	
	def testMergeProperties(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['Properties'].append({ "Id": "Test1",
									"Name": "Test1"})
		testProps['Properties'].append({ "Id": "Test2",
									"Name": "Test2"})
		testProps['Properties'].append({ "Id": "Test1,Test2",
									"DataType": "Text",
									"GroupId": "AlleleFreq"})
		settingsLoaded.loadProps(testProps)

		
		self.assertEqual('AlleleFreq', settingsLoaded.getPropertyValue('Test1',"GroupId"))
		
	
	#DefineKnownTokens seems to convert the case of properties
	def testKnownTokens(self):
	
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['Properties'][0]['NotAProp'] = False
		
		#settingsLoaded.loadProps(testProps)
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
														
	def testSetDefaultProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		self.assertNotIn("Search",testProps["Properties"][0])
		self.assertEqual(settingsLoaded.getPropertyValue('Test',"Search"), 'None')

	def testPropertyEnum(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["Properties"][0]["Search"] = 'NotAVal'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyType(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["Properties"][0]["MinVal"] = 'NotAnInt'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testPropertyId(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["PrimKey"] = 'Test'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["PrimKey"] = 'AutoKey'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["PrimKey"] = 'NotAProp'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyIds(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["QuickFindFields"] = 'Test,TestA'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["QuickFindFields"] = 'Test,NotAProp'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		
	def testRequiredProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		del testProps["Properties"][0]["DataType"]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testRequiredChildProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps["Properties"][0]["Relation"] = 'NotAVal'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["Properties"][0]["Relation"] = {}
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testGetSetting(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertEquals(testProps['NamePlural'],settingsLoaded['NamePlural'])

	def testGetDefaultSetting(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertEquals(200000,settingsLoaded['MaxCountQueryRecords'])
		
		
	def testSiblingOptional(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["DataItemViews"] = [ { 'Type': 'FieldList', 'Name': 'TestGroup', 'Introduction': 'Intro text', 'Fields': [ 'Test' ]} ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["DataItemViews"] = [ { 'Type': 'FieldList', 'Name': 'TestGroup', 'Fields': [ 'Test' ] } ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'Introduction': 'Intro text', 'Fields': [ 'Test' ] } ]
		#Should raise an error for extra field 'Fields'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testSiblingValue(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps['Properties'].append({ "Id": "TestSV",
									"Name": "TestSV",
									"DataType": "Value",
									"ShowBar": True})
		
		settingsLoaded.loadProps(testProps)
		
		
		

	def testSiblingRequired(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'GroupId': 'TestGroupId'} ]
		settingsLoaded.loadProps(testProps)
				
		settingsLoaded = SettingsDataTable()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'GroupId': 'TestGroupId', 'MapZoom': 2} ]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup' } ]
		#Should raise an error for no GroupId
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

		
	def testSettingRequired(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['IsPositionOnGenome'] = True
		#Should raise an error because no Chromosome or Position
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = SettingsDataTable()
		testProps['Chromosome'] = 'TestA'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = SettingsDataTable()
		testProps['Position'] = 'Test'
		settingsLoaded.loadProps(testProps)
	
	def testSerialize(self):

		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['Properties'].append({ "Id": "Test1",
									"Name": "Test1",
									"DataType": "Value"})
		testProps['Properties'].append({ "Id": "Test2",
									"Name": "Test2",
									"DataType": "Text",
									"IsCategorical": True})
		settingsLoaded.loadProps(testProps)
		prop = settingsLoaded.serializeProperty("Test1")
		propDict = simplejson.loads(prop, strict=False)
		self.assertIn('Search', propDict, 'Search default value should be set')
		self.assertNotIn('Name', propDict, 'Name should not be serialized')
		prop = settingsLoaded.serializeProperty("Test2")
		propDict = simplejson.loads(prop, strict=False)
		self.assertNotIn('IsCategorical', propDict, 'propName not working - old value present')
		self.assertIn('isCategorical', propDict, 'propName not working - new value not present')
		
	def walkSampleData(self, method):
		import config
		startDir = os.path.abspath(os.path.join('sampledata','datasets'))
	#startDir = "/vagrant/panoptes/current/sampledata/datasets/Samples_and_Variants/datatables/samples"
		for dirName, subdirList, fileList in os.walk(startDir):
#			print "Checking:" + dirName
			if 'settings' in fileList:
				configType = dirName
				while True:
					configType = os.path.abspath(os.path.join(configType, os.pardir))
					
#					print "Looking for configType:"+ configType
					ct = os.path.basename(configType)
					if method(ct, os.path.join(dirName, 'settings')):
						break
					if configType == startDir:
						break
					
					
					
	def validateSettings(self, settingsType, file):
		
		try:
			if settingsType == "2D_datatables":
				settingsLoaded = Settings2Dtable()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == 'customdata':
				#print "Validating datatable settings:" + file
				settingsLoaded = SettingsCustomData()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == 'datatables':
				#print "Validating datatable settings:" + file
				settingsLoaded = SettingsDataTable()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == "workspaces":
				settingsLoaded = SettingsWorkspace()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == "refgenome":
				settingsLoaded = SettingsRefGenome()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == "graphs":
				settingsLoaded = SettingsGraph()
				settingsLoaded.loadFile(file, True)
				return True
			elif settingsType == "summaryvalues":
				parent = os.path.join(file,os.path.pardir)
				if os.path.isfile(os.path.join(parent,'values')):
					settingsLoaded = SettingsSummary()
					propName = os.path.basename(parent)
					settingsLoaded.loadPropsFile(propName ,file)
				return True
		except ValueError as ve:
			self.fail(settingsType + ':' + file + ':' + str(ve))
		except KeyError as ve:
			self.fail(settingsType + ':' + file + ':' + str(ve))
		return False
	
#	@unittest.skip("demonstrating skipping")
	def testSampleData(self):
		self.walkSampleData(self.validateSettings)
		
if __name__ == '__main__':
	unittest.main()
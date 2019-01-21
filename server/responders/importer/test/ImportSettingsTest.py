from __future__ import print_function
from future import standard_library
standard_library.install_aliases()
import unittest
import os
from SettingsDataTable import SettingsDataTable
import simplejson
import yaml
from Settings2Dtable import Settings2Dtable
from SettingsRefGenome import SettingsRefGenome
from SettingsGraph import SettingsGraph
from SettingsDataset import SettingsDataset
from SettingsMapLayer import SettingsMapLayer
from builtins import file

''' Not doing it anymore....
	def testConvertBoolean(self):
	
		valuest = [ "true", "yes", "y", "1", 1]
		valuesf = [ "false", "no", "n", "0", 0 ]
		
		testProps = self._testProps
		testProps['properties'][0]['isCategorical'] = False
		for val in valuest:
			settingsLoaded = SettingsDataTable()
			testProps['properties'][0]['isCategorical'] = val
			settingsLoaded.loadProps(testProps)
			loaded = settingsLoaded.getPropertyValue('Test',"isCategorical")
			self.assertIs(type(loaded), bool)
			self.assertTrue(loaded)

			
		for val in valuesf:
			settingsLoaded = SettingsDataTable()
			testProps['properties'][0]['isCategorical'] = val
			settingsLoaded.loadProps(testProps)
			self.assertIs(type(settingsLoaded.getPropertyValue('Test',"isCategorical")), bool)
			self.assertFalse(settingsLoaded.getPropertyValue('Test',"isCategorical"))
'''

class ImportSettingsTest(unittest.TestCase):

	def setUp(self):
		self._testProps = { 'nameSingle': '',
						'namePlural': '',
						'primKey': 'Test',
						'sortDefault': 'Test',
						'description': '',
						'properties': [{"id": "Test",
										"name": "Test",
										"dataType": "Text"
										},
										{"id": "TestA",
										"name": "TestA",
										"dataType": "Float"
										}]}
	
	def testMergeProperties(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['properties'].append({ "id": "Test1",
									"name": "Test1"})
		testProps['properties'].append({ "id": "Test2",
									"name": "Test2"})
		testProps['properties'].append({ "id": "Test1,Test2",
									"dataType": "Text",
									"groupId": "alleleFreq"})
		settingsLoaded.loadProps(testProps)

		
		self.assertEqual('alleleFreq', settingsLoaded.getPropertyValue('Test1',"groupId"))
		
	
	#DefineKnownTokens seems to convert the case of properties
	def testKnownTokens(self):
	
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['properties'][0]['notAProp'] = False
		
		#settingsLoaded.loadProps(testProps)
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
														
	def testSetDefaultProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		self.assertNotIn("search",testProps["properties"][0])
		self.assertEqual(settingsLoaded.getPropertyValue('Test',"search"), 'None')

	def testPropertyEnum(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["properties"][0]["search"] = 'NotAVal'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyType(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["properties"][0]["minVal"] = 'NotAnInt'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testPropertyId(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["primKey"] = 'Test'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["primKey"] = 'AutoKey'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["primKey"] = 'NotAProp'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyIds(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["quickFindFields"] = 'Test,TestA'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["quickFindFields"] = 'Test,NotAProp'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		
	def testRequiredProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		del testProps["properties"][0]["dataType"]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testRequiredChildProperty(self):
		
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps["properties"][0]["Relation"] = 'NotAVal'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["properties"][0]["Relation"] = {}
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testGetSetting(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertEquals(testProps['namePlural'],settingsLoaded['namePlural'])

	def testGetDefaultSetting(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertFalse(settingsLoaded['fetchRecordCount'])
		
		
	def testSiblingOptional(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["dataItemViews"] = [ { 'type': 'FieldList', 'name': 'TestGroup', 'introduction': 'Intro text', 'fields': [ 'Test' ]} ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["dataItemViews"] = [ { 'type': 'FieldList', 'name': 'TestGroup', 'fields': [ 'Test' ] } ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["dataItemViews"] = [ { 'type': 'PropertyGroup', 'name': 'TestGroup', 'introduction': 'Intro text', 'fields': [ 'Test' ] } ]
		#Should raise an error for extra field 'Fields'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testSiblingValue(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps['properties'].append({ "id": "TestSV",
									"name": "TestSV",
									"dataType": "Float",
									"showBar": True})
		
		settingsLoaded.loadProps(testProps)
		
		
		

	def testSiblingRequired(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		
		testProps["dataItemViews"] = [ { 'type': 'PropertyGroup', 'name': 'TestGroup', 'groupId': 'TestGroupId'} ]
		settingsLoaded.loadProps(testProps)
				
		settingsLoaded = SettingsDataTable()
		testProps["dataItemViews"] = [ { 'type': 'PropertyGroup', 'name': 'TestGroup', 'groupId': 'TestGroupId', 'mapZoom': 2} ]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = SettingsDataTable()
		testProps["dataItemViews"] = [ { 'type': 'PropertyGroup', 'name': 'TestGroup' } ]
		#Should raise an error for no GroupId
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

		
	def testSettingRequired(self):
		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['isPositionOnGenome'] = True
		#Should raise an error because no Chromosome or Position
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = SettingsDataTable()
		testProps['chromosome'] = 'TestA'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = SettingsDataTable()
		testProps['position'] = 'Test'
		settingsLoaded.loadProps(testProps)
	
	def testSerialize(self):

		settingsLoaded = SettingsDataTable()
		testProps = self._testProps
		testProps['properties'].append({ "id": "Test1",
									"name": "Test1",
									"dataType": "Float"})
		testProps['properties'].append({ "id": "Test2",
									"name": "Test2",
									"dataType": "Text",
									"isCategorical": True})
		settingsLoaded.loadProps(testProps)

	def walkSampleData(self, method):
		import config
		startDir = os.path.abspath(os.path.join('sampledata','datasets'))
	#startDir = "/vagrant/panoptes/current/sampledata/datasets/Samples_and_Variants/datatables/samples"
		for dirName, subdirList, fileList in os.walk(startDir):
#			print "1Checking:" + dirName
			if 'settings' in fileList:
				configType = dirName
				found = False
				while True:
#					print "Looking for configType:"+ configType
					ct = os.path.basename(configType)
#					print "Checking:" + ct + ':' + os.path.join(dirName, 'settings')
					result = method(ct, os.path.join(dirName, 'settings'))
					if result is not None:
						found = True
#						print "Found:" + ct + ':' + os.path.join(dirName, 'settings')
						break
#					else:
#						print "Not found:" + ct + ':' + os.path.join(dirName, 'settings') + ':' + str(result)
					if configType == startDir:
#						print "break!" + startDir
						break
					ct = os.path.abspath(os.path.join(configType, os.pardir))
					configType = ct
					
				if not found:
					self.fail('Did not validate settings file in:' + dirName)
					
					
	def validateSettings(self, settingsType, file):
		
		validateTestLoad = None
		# try:
		if settingsType == "2D_datatables":
			validateTestLoad = Settings2Dtable()
			validateTestLoad.loadFile(file, True)
		elif settingsType == 'datasets':
			validateTestLoad = SettingsDataset()
			validateTestLoad.loadFile(file, True)
		elif settingsType == 'datatables':
			validateTestLoad = SettingsDataTable()
			validateTestLoad.loadFile(file, True)
		elif settingsType == "refgenome":
			validateTestLoad = SettingsRefGenome()
			validateTestLoad.loadFile(file, True)
		elif settingsType == "graphs":
			validateTestLoad = SettingsGraph()
			validateTestLoad.loadFile(file, True)
		elif settingsType == "maps":
			validateTestLoad = SettingsMapLayer()
			validateTestLoad.loadFile(file, True)
		elif settingsType == 'summaryvalues':
			parent = os.path.dirname(file)
			validateTestLoad = SettingsDataTable()
			validateTestLoad.loadFile(file, True)
		elif settingsType == 'pre' or settingsType == 'post':
			validateTestLoad = {}
		return validateTestLoad
	
	def testSampleData(self):
		self.walkSampleData(self.validateSettings)
	
#	@unittest.skip("demonstrating skipping")
	def roundTrip(self, settingsType, file):
		
		#Don't want to just load the YAML due to mergeProperties extension in ImportSettings
		settings1 = self.validateSettings(settingsType, file)
					
		if settings1 is None:
			return settings1
		
		try:
			json1 = simplejson.dumps(settings1._settings, sort_keys=True, indent=4 * ' ')
		except AttributeError as ae:
			#Catches plugin settings ({}) - '_settings' in {} just seems to hang
			print("No _settings for:" + settingsType + ':' + file)
			return settings1
		
		#Can't serialize as that excludes fields
		parsed1 = simplejson.loads(json1, strict=False)
		
		jsonyaml = yaml.dump(parsed1, default_flow_style=False)
		
		settings2 = yaml.load(jsonyaml)
		
		json2 = simplejson.dumps(settings2, sort_keys=True, indent=4 * ' ')
		
		if (json1 != json2):
			self.fail("json1 != json2:" + settingsType + ':' + file + ':\n' + json1 + '\n' + json2 )
			
		return settings1
               
	def testRoundTrip(self):
		self.walkSampleData(self.roundTrip)
if __name__ == '__main__':
	unittest.main()
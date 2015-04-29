import unittest
import os
import ImportSettings
import simplejson

''' Not doing it anymore....
	def testConvertBoolean(self):
	
		valuest = [ "true", "yes", "y", "1", 1]
		valuesf = [ "false", "no", "n", "0", 0 ]
		
		testProps = self._testProps
		testProps['Properties'][0]['IsCategorical'] = False
		for val in valuest:
			settingsLoaded = ImportSettings.ImportSettings()
			testProps['Properties'][0]['IsCategorical'] = val
			settingsLoaded.loadProps(testProps)
			loaded = settingsLoaded.getPropertyValue('Test',"IsCategorical")
			self.assertIs(type(loaded), bool)
			self.assertTrue(loaded)

			
		for val in valuesf:
			settingsLoaded = ImportSettings.ImportSettings()
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
		settingsLoaded = ImportSettings.ImportSettings()
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
	
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		testProps['Properties'][0]['NotAProp'] = False
		
		#settingsLoaded.loadProps(testProps)
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
														
	def testSetDefaultProperty(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		self.assertNotIn("Search",testProps["Properties"][0])
		self.assertEqual(settingsLoaded.getPropertyValue('Test',"Search"), 'None')

	def testPropertyEnum(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["Properties"][0]["Search"] = 'NotAVal'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyType(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["Properties"][0]["MinVal"] = 'NotAnInt'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testPropertyId(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["PrimKey"] = 'Test'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["PrimKey"] = 'AutoKey'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["PrimKey"] = 'NotAProp'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testPropertyIds(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["QuickFindFields"] = 'Test,TestA'
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["QuickFindFields"] = 'Test,NotAProp'
		
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		
	def testRequiredProperty(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		del testProps["Properties"][0]["DataType"]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
	def testRequiredChildProperty(self):
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		testProps["Properties"][0]["Relation"] = 'NotAVal'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["Properties"][0]["Relation"] = {}
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testGetSetting(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertEquals(testProps['NamePlural'],settingsLoaded['NamePlural'])

	def testGetDefaultSetting(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		settingsLoaded.loadProps(testProps)
		
		self.assertEquals(200000,settingsLoaded['MaxCountQueryRecords'])
		
		
	def testSiblingOptional(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["DataItemViews"] = [ { 'Type': 'FieldList', 'Name': 'TestGroup', 'Introduction': 'Intro text', 'Fields': [ 'Test' ]} ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["DataItemViews"] = [ { 'Type': 'FieldList', 'Name': 'TestGroup', 'Fields': [ 'Test' ] } ]
		settingsLoaded.loadProps(testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'Introduction': 'Intro text', 'Fields': [ 'Test' ] } ]
		#Should raise an error for extra field 'Fields'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

	def testSiblingValue(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps['Properties'].append({ "Id": "TestSV",
									"Name": "TestSV",
									"DataType": "Value",
									"BarWidth": 180})
		
		settingsLoaded.loadProps(testProps)
		
		
		

	def testSiblingRequired(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'GroupId': 'TestGroupId'} ]
		settingsLoaded.loadProps(testProps)
				
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup', 'GroupId': 'TestGroupId', 'MapZoom': 2} ]
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		
		settingsLoaded = ImportSettings.ImportSettings()
		testProps["DataItemViews"] = [ { 'Type': 'PropertyGroup', 'Name': 'TestGroup' } ]
		#Should raise an error for no GroupId
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)

		
	def testSettingRequired(self):
		settingsLoaded = ImportSettings.ImportSettings()
		testProps = self._testProps
		testProps['IsPositionOnGenome'] = True
		#Should raise an error because no Chromosome or Position
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = ImportSettings.ImportSettings()
		testProps['Chromosome'] = 'TestA'
		self.assertRaises(ValueError, settingsLoaded.loadProps, testProps)
		settingsLoaded = ImportSettings.ImportSettings()
		testProps['Position'] = 'Test'
		settingsLoaded.loadProps(testProps)
	
	def testSerialize(self):

		settingsLoaded = ImportSettings.ImportSettings()
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
		self.assertIn('maxval', propDict, 'maxval default value should be set')
		self.assertNotIn('Name', propDict, 'Name should not be serialized')
		prop = settingsLoaded.serializeProperty("Test2")
		propDict = simplejson.loads(prop, strict=False)
		self.assertNotIn('maxval', propDict, 'maxval default value should not be set')
		self.assertNotIn('IsCategorical', propDict, 'propName not working - old value present')
		self.assertIn('isCategorical', propDict, 'propName not working - new value not present')
		
if __name__ == '__main__':
	unittest.main()
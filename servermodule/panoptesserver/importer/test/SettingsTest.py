import unittest
import os
import ImpUtils
import SettingsLoader

class SettingsTest(unittest.TestCase):

	def setUp(self):
		log = False
		testDir = "/vagrant/panoptes/current/sampledata/datasets/Samples_and_Variants/datatables/variants"
		self._settings = SettingsLoader.SettingsLoader(os.path.join(testDir,'settings'), False)
		self._properties = ImpUtils.LoadPropertyInfo(None, self._settings, os.path.join(testDir,'data'), log)
	
	def testMergeProperties(self):
		for props in self._properties:
			self.assertIn('propid', props)
			if props['propid'] == 'NRAF_WAF':
				self.assertTrue(props['Settings'].HasToken('GroupId'))
				self.assertEqual('AlleleFreq', props['Settings']['GroupId'])
				#Equivalent non API  
				self.assertIn('GroupId', props['Settings'].settings)
				self.assertEqual('AlleleFreq', props['Settings'].settings['GroupId'])  
		
	def testMergeSettings(self):	
		#Settings aren't merged
		self.assertTrue(True)
		#for props in self._settings['Properties']:
		#	print str(props)
	
	
	#DefineKnownTokens seems to convert the case of properties
	def testKnownTokens(self):
	
		settingsLoaded = SettingsLoader.SettingsLoader()
		settingsLoaded.LoadDict({ "Id": "Test",
													"MinVal": 0 })

		self.assertTrue(settingsLoaded.HasToken('MinVal'))
		self.assertFalse(settingsLoaded.HasToken('minval'))
		settingsLoaded.DefineKnownTokens(['minval', 'maxval'])
		self.assertTrue(settingsLoaded.HasToken('minval'))
		self.assertFalse(settingsLoaded.HasToken('MinVal'))

	def testConvertBoolean(self):
	
		valuest = [ "true", "yes", "y", "1"]
		valuesf = [ "false", "no", "n", "0" ]
		
		for val in valuest:
			settingsLoaded = SettingsLoader.SettingsLoader()
			settingsLoaded.LoadDict({ "Id": "Test",
													"TestVal": val })
			settingsLoaded.ConvertToken_Boolean('TestVal')
			self.assertIs(type(settingsLoaded["TestVal"]), bool)
			self.assertTrue(settingsLoaded["TestVal"])
			
		for val in valuesf:
			settingsLoaded = SettingsLoader.SettingsLoader()
			settingsLoaded.LoadDict({ "Id": "Test",
													"TestVal": val })
			settingsLoaded.ConvertToken_Boolean('TestVal')
			self.assertIs(type(settingsLoaded["TestVal"]), bool)
			self.assertFalse(settingsLoaded["TestVal"])
													
	
if __name__ == '__main__':
	unittest.main()
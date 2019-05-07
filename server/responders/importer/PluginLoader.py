from __future__ import absolute_import
from builtins import str
import imp
import os
import sys
from .BaseImport import BaseImport
from .PluginSettings import PluginSettings

class PluginLoader(BaseImport):
    
    def getPlugins(self):
        plugins = []
        
        plugin_folders = []
        
        pp = self._config.getPluginPath()
        if pp:
            plugin_folders = pp.split(os.pathsep)
            

        for path in sys.path:
            testDir = os.path.join(path,'responders','importer','plugins')
            if os.path.isdir(testDir):
                plugin_folders.append(testDir)
        plugin_folders = set(plugin_folders)
        for plugin_folder in plugin_folders:
            self._log('Looking for plugins in ' + plugin_folder)
            possibleplugins = os.listdir(plugin_folder)
            for i in possibleplugins:
                location = os.path.join(plugin_folder, i)
                if not os.path.isdir(location) or not i + ".py" in os.listdir(location):
                    self._log('Could not find ' + i + ".py in " + location)
                    continue
                info = imp.find_module(i, [location])
                plugins.append({"name": i, "info": info})
        return plugins
    
    def loadPlugin(self, plugin, dirPath, settings):
        # Fast path: see if the module has already been imported.
        try:
            m = sys.modules[plugin["name"]]
        except KeyError:
            m = imp.load_module(plugin["name"], *plugin["info"])
        try:
            return getattr(m, plugin["name"])(self._calculationObject, self._datasetId, settings, dirPath)
        finally:
            fp = plugin["info"][0]
            if fp:
                fp.close()
     
    def _getModuleFolders(self, parent):
        
        modules = []
        subDir = os.path.join(self._datasetFolder, parent)
        
        if not os.path.isdir(subDir):
            return modules
        
        for directory in os.listdir(subDir):
            dirPath = os.path.join(subDir, directory)
            if os.path.isdir(dirPath):
                if directory not in modules:
                    modules.append(dirPath)
        
        self._log(parent + ' modules: ' + str(modules))
        return modules
    
    def importAll(self, location):
                
        modules = self._getModuleFolders(location)

        for dirPath in modules:
 
            settings = os.path.join(dirPath, 'settings')
            if not os.path.isfile(settings):
                self._log("Missing settings file {}".format(settings))
                
            plugin_settings = PluginSettings(fileName = settings, validate = False)
            
            self._log("Loading plugin:" + plugin_settings["plugin"])
            for i in self.getPlugins():
                if i["name"] == plugin_settings["plugin"]:
                    plugin = self.loadPlugin(i, dirPath, settings)
                    plugin.run()
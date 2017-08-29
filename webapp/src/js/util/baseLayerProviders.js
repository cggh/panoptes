import 'leaflet-providers/leaflet-providers.js';

const baseLayerProviders = {};
const providers = window.L.TileLayer.Provider.providers;
if (providers !== undefined) {
  let providerNames = Object.keys(providers);
  providerNames.sort();

  let attributionReplacer = function(attr) {
    if (attr.indexOf('{attribution.') === -1) {
      return attr;
    }
    return attr.replace(/\{attribution.(\w*)\}/,
      (match, attributionName) => attributionReplacer(providers[attributionName].options.attribution)
    );
  };

  for (let i = 0, len = providerNames.length; i < len; i++) {
    let providerName = providerNames[i];
    let providerConfig = providers[providerName];

    //These require registration
    if (providerName === 'HERE' || providerName === 'MapBox' ||
        // Thunderforest requires apikey
        providerName === 'Thunderforest' ||
        // NASAGIBS requires {time}, {tilematrixset}
        providerName === 'NASAGIBS' ||
        // JusticeMap requires {size}
        providerName === 'JusticeMap' ||
        // OpenWeatherMap takes too long to load and is not relevant
        providerName === 'OpenWeatherMap') {
      continue;
    }

    let {options, url, variants} = providerConfig;
    let {attribution, ext, format, maxZoom, minZoom, variant} = options || {};
    if (attribution) {
      attribution = attributionReplacer(attribution);
    }

    // Add the default variant of this provider's tile layer to the list
    // Only if
    // - there is a URL
    // - AND there is either no {variant} placeholder in the URL, OR there is both a placeholder and a value for variant.
    if (
      url !== undefined
      && (!url.includes('{variant}') || (url.includes('{variant}') && variant !== undefined))
      && !providerName.match('BasemapAT|FreeMapSK|NLS|OpenSeaMap')
    ) {
      baseLayerProviders[providerName] = {attribution, ext, format, maxZoom, minZoom, name: providerName, variant, url};
    }

    // If this provider has variants...
    // FIXME: List of tile layer variants that don't work, e.g. BasemapAT
    if (
      variants !== undefined
      && typeof variants === 'object'
      && !providerName.match('BasemapAT')
    ) {

      let variantKeyNames = Object.keys(variants);
      variantKeyNames.sort();

      for (let j = 0, len = variantKeyNames.length; j < len; j++) {
        let variantKeyName = variantKeyNames[j];
        let variantConfig = providerConfig.variants[variantKeyName];
        if (variantConfig.options) {
          options = variantConfig.options;
        }
        let variant = options.variant || variant;
        if (typeof variantConfig === 'string') {
          variant = variantConfig;
        }
        let layerId = providerName + '.' + variantKeyName;
        let {attribution, ext, format, maxZoom, minZoom} = options;
        if (attribution) {
          attribution = attributionReplacer(attribution);
        }
        url = options.url || url; //Use url from top level if variant doesn't have it

        if (url === undefined) {
          console.warn('URL could not be determined for map tile layer: ' + layerId);
          continue;
        }

        baseLayerProviders[layerId] = {attribution, ext, format, maxZoom, minZoom, name: layerId, variant, url};
      }
    }
  }
}

export default baseLayerProviders;

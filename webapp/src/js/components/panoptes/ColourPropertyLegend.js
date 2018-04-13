import PropTypes from 'prop-types';
import React from 'react';
import _isEmpty from 'lodash.isempty';
import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import LegendElement from 'panoptes/LegendElement';
import {propertyColour, scaleColour, isColourDark} from 'util/Colours';
import Color from 'color';

class ColourPropertyLegend extends React.Component {

  static defaultProps = {
    query: SQL.nullQuery
  };

  static displayName = 'ColourPropertyLegend';

  static propTypes = {
    table: PropTypes.string.isRequired,
    labelProperty: PropTypes.string,
    maxLegendItems: PropTypes.number,
    colourProperty: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    numberOfBins: PropTypes.number,
    colourRange: PropTypes.array, // Overrides default Colours scaleColours but not propConfig.valueColours
    hideLegendTitle: PropTypes.bool,
    binTextColour: PropTypes.string,
    noDataColour: PropTypes.string,
    zeroColour: PropTypes.string,
    noDataText: PropTypes.string,
    layout: PropTypes.oneOf(['values-inside-colours', 'values-outside-colours']),
    tickLineColour: PropTypes.string,
    tickLineHeight: PropTypes.string,
    valueSuffix: PropTypes.string,
    binHeight: PropTypes.string,
    colourFillOpacity: PropTypes.number,
    colourBackgroundColour: PropTypes.string,
    showColourBorder: PropTypes.bool,
    config: PropTypes.object, // This will be provided via withAPIData
    data: PropTypes.array // This will be provided via withAPIData
  };

  static defaultProps = {
    hideLegendTitle: false,
    noDataColour: '#F2EFE9',
    noDataText: 'no data',
    layout: 'values-inside-colours',
    tickLineColour: '#A0A0A0',
    tickLineHeight: '7px',
    valueSuffix: '',
    binHeight: '10px',
    showColourBorder: true,
  }

  render() {
    let {
      table, labelProperty, maxLegendItems, colourProperty, config, data,
      max, min, numberOfBins, colourRange, hideLegendTitle, binTextColour,
      noDataColour, zeroColour, noDataText, layout, tickLineColour, valueSuffix,
      binHeight, tickLineHeight, colourFillOpacity, colourBackgroundColour,
      showColourBorder,
    } = this.props;

    // NOTE: render() is still called when isRequired props are undefined.
    if (data === undefined || data === null) {
      return null;
    }

    // If a labelProperty has not been provided, then use the colourProperty
    labelProperty = labelProperty === undefined ? colourProperty : labelProperty;

    const labelPropConfig = config.tablesById[table].propertiesById[labelProperty];
    const colourPropConfig = config.tablesById[table].propertiesById[colourProperty];
    const colourFunc = propertyColour(colourPropConfig, min, max, colourRange);
    const lightColour = '#F0F0F0';
    const mediumColour = '#888888';
    const darkColour = '#101010';

    if (!colourPropConfig.isBoolean && !colourPropConfig.isCategorical && !colourPropConfig.isText) {

      const legendTitle = hideLegendTitle ? null : <div className="legend-title">{labelPropConfig.name}</div>;
      const minVal = min === undefined ? colourPropConfig.minVal : min;
      const maxVal = max === undefined ? colourPropConfig.maxVal : max;

      if (numberOfBins !== undefined && numberOfBins > 0) {

        let valuesOutsideColours = null;

        const binWidthValue = maxVal / numberOfBins;
        let numberOfBinsIncludingNoDataAndZero = numberOfBins;
        numberOfBinsIncludingNoDataAndZero += noDataColour !== undefined ? 1 : 0;
        numberOfBinsIncludingNoDataAndZero += zeroColour !== undefined ? 1 : 0;
        const binWidthPercentage = 100 / numberOfBinsIncludingNoDataAndZero;
        let binElements = [];
        let labelElements = [];
        let tickElements = [];

        if (noDataColour !== undefined) {

          const noDataBinBackgroundColourIsDark = isColourDark(noDataColour);
          const noDataBinTextColourAmended = binTextColour !== undefined ? binTextColour : (noDataBinBackgroundColourIsDark === null ? mediumColour : (noDataBinBackgroundColourIsDark ? lightColour : darkColour));
          const valueInsideColour = layout === 'values-inside-colours' ? <span>{noDataText}</span> : null;
          binElements.push(
            <div
              key={'noDataBinElement'}
              style={{
                position: 'relative',
                display: 'table-cell',
                width: '' + (binWidthPercentage - 1) + '%',
                color: noDataBinTextColourAmended,
                backgroundColor: noDataColour,
                padding: '0 3px 0 3px',
                border: 'solid #DEBED8 1px',
              }}
            >
              {valueInsideColour}
            </div>
            ,
            <div
              key={'noDataBinSeparatorElement'}
              style={{
                position: 'relative',
                display: 'table-cell',
                width: '1%',
              }}
            >
            </div>
          );

          if (layout === 'values-outside-colours') {
            labelElements.push(
              <div
                key={'noDataLabelElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '' + (binWidthPercentage - 1) + '%',
                  color: binTextColour,
                  padding: '0 3px 0 3px',
                }}
              >
                {noDataText}
              </div>
              ,
              <div
                key={'noDataLabelSeparatorElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '1%',
                }}
              >
              </div>
            );
            tickElements.push(
              <div
                key={'noDataTickElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '' + (binWidthPercentage - 1) + '%',
                }}
              >
                <div style={{height: '100%', width: '50%', borderRight: `solid ${tickLineColour} 1px`}}></div>
              </div>
              ,
              <div
                key={'noDataTickSeparatorElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '1%',
                }}
              >
              </div>
            );
          }
        }

        if (zeroColour !== undefined) {

          // NOTE: reducing the zeroBin width means the other bin widths won't actually add up to 100%.
          // However, the whole table is set to stretch to 100% width, so the difference is spread out automatically.

          // NOTE: Setting CSS opacity would also change the text and border colours.
          const zeroBinBackgroundColourObj = colourFillOpacity !== undefined ? Color(zeroColour).alpha(colourFillOpacity) : Color(zeroColour);

          const zeroBinBackgroundColourIsDark = isColourDark(zeroBinBackgroundColourObj.rgb());
          const zeroBinTextColourAmended = binTextColour !== undefined ? binTextColour : (zeroBinBackgroundColourIsDark === null ? mediumColour : (zeroBinBackgroundColourIsDark ? lightColour : darkColour));
          const valueInsideColour = layout === 'values-inside-colours' ? <span>0</span> : null;


          binElements.push(
            <div
              key={'zeroBinElement'}
              style={{
                position: 'relative',
                display: 'table-cell',
                width: '' + (binWidthPercentage / 2) + '%',
                color: zeroBinTextColourAmended,
                backgroundColor: zeroBinBackgroundColourObj.rgb(), // rgb() gives rgba()
                padding: '0 3px 0 3px',
                border: showColourBorder ? `solid ${zeroColour} 1px` : 'none',
              }}
            >
              {valueInsideColour}
            </div>
          );

          if (layout === 'values-outside-colours') {
            labelElements.push(
              <div
                key={'zeroLabelElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '' + (binWidthPercentage / 2) + '%',
                  color: binTextColour,
                  padding: '0 3px 0 3px',
                }}
              >
                0
              </div>
            );
            tickElements.push(
              <div
                key={'zeroLabelElement'}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: '' + (binWidthPercentage / 2) + '%',
                }}
              >
                <div style={{height: '100%', width: '50%', borderRight: `solid ${tickLineColour} 1px`}}></div>
              </div>
            );
          }

        }


        for (let i = 1; i <= numberOfBins; i++) {

          const binMax = (maxVal / numberOfBins) * i;
          const binMin = binMax - binWidthValue;

          //// Determine bar colours
          const binBackgroundColour = colourFunc((binMax - (binWidthValue / 2)));
          // NOTE: Setting CSS opacity would also change the text and border colours.
          const binBackgroundColourObj = colourFillOpacity !== undefined ? Color(binBackgroundColour).alpha(colourFillOpacity) : Color(binBackgroundColour);
          const binBackgroundColourIsDark = isColourDark(binBackgroundColourObj.rgb());
          const binTextColourAmended = binTextColour !== undefined ? binTextColour : (binBackgroundColourIsDark === null ? mediumColour : (binBackgroundColourIsDark ? lightColour : darkColour));
          const valueInsideColour = layout === 'values-inside-colours' ? <span>{Math.round(binMin)}&ndash;{Math.round(binMax)}{valueSuffix}</span> : null;

          binElements.push(
            <div
              key={'binElement_' + i}
              style={{
                position: 'relative',
                display: 'table-cell',
                width: binWidthPercentage + '%',
                color: binTextColourAmended,
                backgroundColor: binBackgroundColourObj.rgb(), // rgb() gives rgba()
                padding: '0 3px 0 3px',
                borderLeft: layout === 'values-outside-colours' ? `solid ${tickLineColour} 1px` : (showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none'),
                borderRight: (i === numberOfBins && layout === 'values-outside-colours') ? `solid ${tickLineColour} 1px` : (i === numberOfBins && showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none'),
                borderTop: showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none',
                borderBottom: showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none',
              }}
            >
              {valueInsideColour}
            </div>
          );

          if (layout === 'values-outside-colours') {
            labelElements.push(
              <div
                key={'labelElement_' + i}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: binWidthPercentage + '%',
                  color: binTextColour,
                  padding: '0 3px 0 3px',
                  textAlign: 'right',
                  right: '-1.5em',
                }}
              >
                {Math.round(binMax)}{valueSuffix}
              </div>
            );
            tickElements.push(
              <div
                key={'tickElement_' + i}
                style={{
                  position: 'relative',
                  display: 'table-cell',
                  width: binWidthPercentage + '%',
                  borderLeft: `solid ${tickLineColour} 1px`,
                  borderRight: i === numberOfBins ? `solid ${tickLineColour} 1px` : 'none',
                }}
              >
              </div>
            );
          }

        }

        if (layout === 'values-outside-colours') {
          valuesOutsideColours = [
            <div key="tickElements" style={{width: 'calc(100% - 3em)', marginLeft: '1.5em'}}>
              <div
                style={{
                  display: 'table',
                  width: '100%',
                  height: tickLineHeight,
                  borderRight: 'none',
                  textAlign: 'center',
                }}
              >
                {tickElements}
              </div>
            </div>,
            <div key="labelElements" style={{width: 'calc(100% - 3em)', marginLeft: '1.5em'}}>
              <div
                style={{
                  display: 'table',
                  width: '100%',
                  height: '100%',
                  borderRight: 'none',
                  textAlign: 'center',
                }}
              >
                {labelElements}
              </div>
            </div>
          ];
        }

        return (
          <div className="legend">
            {legendTitle}
            <div
              key="binElements"
              style={{
                width: layout === 'values-outside-colours' ? 'calc(100% - 3em)' : '100%',
                marginLeft: layout === 'values-outside-colours' ? '1.5em' : 'inherit',
              }}
            >
              <div
                style={{
                  display: 'table',
                  width: '100%',
                  height: layout === 'values-outside-colours' ? binHeight : '100%',
                  borderRight: 'none',
                  textAlign: 'center',
                  backgroundColor: colourBackgroundColour !== undefined ? colourBackgroundColour : 'inherit',
                }}
              >
                {binElements}
              </div>
            </div>
            {valuesOutsideColours}
          </div>
        );
      } else {
        //// Default to a continuous colour-gradient spectrum, corresponding to values.
        const colour = scaleColour([0, 1], colourRange);
        let background = `linear-gradient(to right, ${colour(0)} 0%`;
        for (let i = 0.1; i < 1; i += 0.1) {
          background += `,${colour(i)} ${i * 100}%`;
        }
        background += ')';

        const minValBackgroundColour = colourFunc(minVal);
        const maxValBackgroundColour = colourFunc(maxVal);
        const minValBackgroundColourIsDark = isColourDark(minValBackgroundColour);
        const maxValBackgroundColourIsDark = isColourDark(maxValBackgroundColour);
        const minValTextColourAmended = binTextColour !== undefined ? binTextColour : (minValBackgroundColourIsDark === null ? mediumColour : (minValBackgroundColourIsDark ? lightColour : darkColour));
        const maxValTextColourAmended = binTextColour !== undefined ? binTextColour : (maxValBackgroundColourIsDark === null ? mediumColour : (maxValBackgroundColourIsDark ? lightColour : darkColour));

        if (layout === 'values-inside-colours') {
          return (
            <div className="legend">
              {legendTitle}
              <div style={{width: '100%', textAlign: 'center'}}>
                <div style={{display: 'inline-block', width: '100%', background}}>
                  <span style={{paddingLeft: '3px', float: 'left', color: minValTextColourAmended}}>{minVal.toString()}{valueSuffix}</span>
                  <span style={{paddingRight: '3px', float: 'right', color: maxValTextColourAmended}}>{maxVal.toString()}{valueSuffix}</span>
                </div>
              </div>
            </div>
          );
        } else if (layout === 'values-outside-colours') {
          const minValWithSuffixLength = minVal.toString().concat(valueSuffix).length;
          const maxValWithSuffixLength = maxVal.toString().concat(valueSuffix).length;
          return (
            <div className="legend">
              {legendTitle}
              <div style={{width: '100%', textAlign: 'center'}}>
                <span style={{width: minValWithSuffixLength + 'em', paddingRight: '0.5em'}}>{minVal.toString()}{valueSuffix}</span>
                <div style={{display: 'inline-block', width: 'calc(100% - ' + (minValWithSuffixLength + maxValWithSuffixLength + 1) + 'em)', background}}>&#8203;</div>
                <span style={{width: maxValWithSuffixLength + 'em', paddingLeft: '0.5em'}}>{maxVal.toString()}{valueSuffix}</span>
              </div>
            </div>
          );
        } else {
          throw Error('layout was not a handled value: ', layout);
        }
      }
    }

    const legendTitle = hideLegendTitle ? null : <div className="legend-title">{labelPropConfig.name}:</div>;

    // When colourPropConfig.isBoolean OR .isCategorical OR .isText
    // Translate the apiData data into legendElements.
    let legendElements = [];
    if (colourPropConfig.isBoolean) {
      legendElements = [
        <LegendElement key="false" name="False" colour={colourFunc(false)} />,
        <LegendElement key="true" name="True" colour={colourFunc(true)} />
      ];
    } else if (colourPropConfig.isCategorical || colourPropConfig.isText) {
      for (let i = 0; i < data.length; i++) {
        let label = data[i][labelProperty];
        let colour = data[i][colourProperty];
        let legendElement = <LegendElement key={`LegendElement_${i}`} name={label !== null ? label : 'NULL'} colour={colourFunc(colour)} />;
        legendElements.push(legendElement);
      }
    }

    if (_isEmpty(legendElements)) {
      return null;
    }

    return <div className="legend">
      {legendTitle}
      {maxLegendItems === undefined || (maxLegendItems !== undefined && legendElements.length < maxLegendItems) ?
        legendElements
        : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
      }
    </div>;
  }
}

ColourPropertyLegend = withAPIData(ColourPropertyLegend, ({config, props}) => {

  let {table, colourProperty, labelProperty, query} = props;
  query = query ||
    (table ? config.tablesById[table].defaultQuery : null) ||
    SQL.nullQuery;


  let columns = [colourProperty, (labelProperty === undefined ? config.tablesById[table].primKey : labelProperty)];

  return {
    requests: {
      data: {
        method: 'query',
        args: {
          database: config.dataset,
          table,
          columns,
          query,
          transpose: true
        }
      }
    }
  };
});

export default ColourPropertyLegend;

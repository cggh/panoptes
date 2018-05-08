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
    hideLegendTitle: PropTypes.bool,
    binTextColour: PropTypes.string,
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
    noDataText: 'no data',
    layout: 'values-inside-colours',
    tickLineColour: '#A0A0A0',
    tickLineHeight: '7px',
    valueSuffix: '',
    binHeight: '10px',
    showColourBorder: true,
  };

  render() {
    let {
      table, labelProperty, maxLegendItems, colourProperty, config, data,
      hideLegendTitle, binTextColour,
      noDataText, layout, tickLineColour, valueSuffix,
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
    let {colours, thresholds, nullColour, interpolate} = colourPropConfig.scaleColours;
    const colourFunc = propertyColour(colourPropConfig);
    const lightColour = '#F0F0F0';
    const mediumColour = '#888888';
    const darkColour = '#101010';

    if (colourPropConfig.isNumerical) {

      const legendTitle = hideLegendTitle ? null : <div className="legend-title">{labelPropConfig.name}</div>;

      let valuesOutsideColours = null;

      let numberOfBinsIncludingNoData = thresholds.length;
      const binWidthPercentage = 100 / numberOfBinsIncludingNoData;
      let binElements = [];
      let labelElements = [];
      let tickElements = [];

      const noDataBinBackgroundColourIsDark = isColourDark(nullColour);
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
            backgroundColor: nullColour,
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

      for (let i = 0, numberOfBins = thresholds.length - 1; i < numberOfBins; i++) {
        const binMin = thresholds[i];
        const binMax = thresholds[i+1];
        //// Determine bar colours
        let binBackgroundColour = colours[i];
        // NOTE: Setting CSS opacity would also change the text and border colours.
        const binBackgroundColourObj = colourFillOpacity !== undefined ? Color(binBackgroundColour).alpha(colourFillOpacity) : Color(binBackgroundColour);
        const binBackgroundColourIsDark = isColourDark(binBackgroundColourObj.rgb());
        const binTextColourAmended = binTextColour !== undefined ? binTextColour : (binBackgroundColourIsDark === null ? mediumColour : (binBackgroundColourIsDark ? lightColour : darkColour));
        const valueInsideColour = layout === 'values-inside-colours' ? <span>{Math.round(binMin)}&ndash;{Math.round(binMax)}{valueSuffix}</span> : null;
        console.log(binBackgroundColour);
        const style={
          border: 0,
            position: 'relative',
            display: 'table-cell',
            width: binWidthPercentage + '%',
            color: binTextColourAmended,
            backgroundColor: binBackgroundColourObj.rgb(), // rgb() gives rgba()
            padding: '0 3px 0 3px',
            borderLeft: layout === 'values-outside-colours' ? `solid ${tickLineColour} 1px` : (showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none'),
            borderRight: (i === numberOfBins && layout === 'values-outside-colours') ? `solid ${tickLineColour} 1px` : (i === numberOfBins && showColourBorder ? `solid ${binBackgroundColour} 1px` : 'none'),
        };
        if (interpolate) {
          let gradientColour = `linear-gradient(to right, ${colourFunc(binMin)} 0%`;
          for (let i = 0.1; i < 1; i += 0.2) {
            gradientColour += `,${colourFunc(binMin + i*(binMax-binMin))} ${i * 100}%`;
          }
          gradientColour += ')';
          style.background = gradientColour;
        }
        binElements.push(
          <div
            key={'binElement_' + i}
            style={style}
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
                borderRight: i === numberOfBins-1 ? `solid ${tickLineColour} 1px` : 'none',
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

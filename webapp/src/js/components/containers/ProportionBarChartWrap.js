import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import Table, {
  TableBody,
  TableCell,
  TableRow,
} from 'material-ui/Table';

let ProportionBarChartWrap = createReactClass({
  displayName: 'ProportionBarChartWrap',

  propTypes: {
    children: PropTypes.node,
    rowHeight: PropTypes.string,
    showTickLabels: PropTypes.bool,
    numberOfTickLines: PropTypes.number,
    numberOfTickLabels: PropTypes.number, // Defaults to numberOfTickLines.
  },

  getDefaultProps() {
    return {
      rowHeight: '35px',
      numberOfTickLines: 10,
      showTickLabels: true,
    };
  },

  render() {
    const {
      children,
      showTickLabels,
      rowHeight,
      numberOfTickLines,
      numberOfTickLabels,
    } = this.props;

    const amendedNumberOfTickLabels = numberOfTickLabels !== undefined ? numberOfTickLabels : numberOfTickLines;

    const tickLabelWidthPercentage = 100 / amendedNumberOfTickLabels;
    let tickPercentageElements = [];
    for (let i = 1; i <= amendedNumberOfTickLabels; i++) {
      tickPercentageElements.push(
        <div
          key={'tickPercentageElement_' + i}
          style={{
            position: 'relative',
            display: 'table-cell',
            width: tickLabelWidthPercentage + '%',
            textAlign: 'center',
          }}
        >
          {i * tickLabelWidthPercentage}%
        </div>
      );
    }

    const cellStyle = {
      border: 'none',
    };

    return (
      <Table>
        <TableBody>
          {children}
          {showTickLabels ?
            <TableRow
              key={'row_tickPercentages'}
              hover={false}
            >
              <TableCell
                style={{
                  ...cellStyle,
                  position: 'relative',
                  width: '30%',
                  height: rowHeight,
                }}
                padding="none"
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '-1em',
                  }}
                >
                    0%
                </div>
              </TableCell>
              <TableCell
                style={{
                  ...cellStyle,
                  width: '60%',
                  position: 'relative',
                }}
                padding="none"
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '' + (tickLabelWidthPercentage / 2) + '%', // Edge text-align overrides left, so keep separate.
                    display: 'table',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {tickPercentageElements}
                </div>
              </TableCell>
            </TableRow>
            : null
          }
        </TableBody>
      </Table>
    );
  },
});

export default ProportionBarChartWrap;

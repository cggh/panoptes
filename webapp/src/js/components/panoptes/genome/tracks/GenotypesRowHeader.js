import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import Formatter from 'panoptes/Formatter';

let GenotypesRowHeader = createReactClass({
  displayName: 'GenotypesRowHeader',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
  ],

  propTypes: {
    table: PropTypes.string,
    height: PropTypes.number,
    width: PropTypes.number,
    rowLabel: PropTypes.string,
    rowHeight: PropTypes.number,
    rowData: PropTypes.object
  },

  componentDidMount() {
    this.paint(this.canvas);
  },

  componentDidUpdate() {
    this.paint(this.canvas);
  },

  paint(canvas) {
    const {rowHeight, width, rowData, rowLabel, table} = this.props;
    const config = this.config.twoDTablesById[table];
    const rowConfig = this.config.tablesById[config.rowDataTable];

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!rowData)
      return;

    const idArray = rowData.id.array;
    const labelArray = rowData.label.array;

    const showIndividualLines = rowHeight > 10;
    const fontSize = Math.min(14, rowHeight - 1);
    ctx.font = `${fontSize}px Roboto`;
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    if (showIndividualLines) {
      ctx.beginPath();
      for (let i = 0; i <= idArray.length; i++) {
        let yPos = (i) * (rowHeight);
        ctx.moveTo(0, yPos + 0.5);
        ctx.lineTo(width, yPos + 0.5);
      }
      ctx.stroke();
    }

    let bottomLineDrawn = false;
    let drawGroupLabel = (labelName, startIndex, endIndex) => {
      if (endIndex < startIndex)
        return;
      let yposTop = startIndex * rowHeight;
      let yposBottom = (endIndex + 1) * rowHeight;
      if (yposBottom > yposTop + 3) {
        ctx.beginPath();
        if (!bottomLineDrawn) {
          ctx.moveTo(0, yposTop + 0.5);
          ctx.lineTo(width, yposTop + 0.5);
        }
        ctx.moveTo(0, yposBottom + 0.5);
        ctx.lineTo(width, yposBottom + 0.5);
        ctx.stroke();
        bottomLineDrawn = true;
        if (yposBottom > yposTop + 5) {
          let fontSize = Math.min(12, yposBottom - yposTop - 1);
          ctx.font = `${fontSize}px Roboto`;
          let textYPos = (yposBottom + yposTop) / 2 - 1 + fontSize / 2;
          ctx.fillText(labelName, 2, textYPos);
        }
      } else {
        bottomLineDrawn = false;
      }
    };

    let groupLabel = null;
    let groupStartIndex = 0;
    for (let i = 0; i <= labelArray.length; i++) {
      let yPos = (i + 1) * (rowHeight);
      const label = Formatter(rowConfig.propertiesById[rowLabel], labelArray[i]);
      if (showIndividualLines) {
        // if (fncIsRowSelected(key))
        //   ctx.fillStyle = 'rgb(255,80,80)';
        // else
        //   ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(1.5, yPos - rowHeight + 2.5, 10, rowHeight - 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fillText(label, 13, yPos - 1 - (rowHeight - fontSize) / 2);
      } else {
        if (label != groupLabel) {
          drawGroupLabel(groupLabel, groupStartIndex, i - 1);
          groupLabel = label;
          groupStartIndex = i;
        }
      }
    }
    if (groupLabel != null)
      drawGroupLabel(groupLabel, groupStartIndex, idArray.length - 1);
  },

  render() {
    let {height, width, table, rowLabel} = this.props;
    const config = this.config.twoDTablesById[table];
    const rowConfig = this.config.tablesById[config.rowDataTable];
    return <div className="genotypes-side">
      <div className="side-name">{config.namePlural}</div>
      <div className="row-label">{rowConfig.propertiesById[rowLabel].name}</div>
      <canvas ref={(el) => this.canvas = el}
        width={width}
        height={height}/>
    </div>;
  },
});

export default GenotypesRowHeader;

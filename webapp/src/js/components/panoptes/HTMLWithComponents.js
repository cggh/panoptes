import PropTypes from 'prop-types';
import React from 'react';
import HtmlToReact from 'html-to-react';
import ComponentRegistry from 'util/ComponentRegistry';
import _forEach from 'lodash.foreach';
import _camelCase from 'lodash.camelcase';
import DocLink from 'panoptes/DocLink';

function createStyleJsonFromString(styleString) {
  if (!styleString) {
    return {};
  }
  let styles = styleString.split(';');
  let singleStyle, key, value, jsonStyles = {};
  for (let i = 0; i < styles.length; i++) {
    singleStyle = styles[i].split(':');
    key = _camelCase(singleStyle[0]);
    value = singleStyle[1];
    if (key.length > 0 && value.length > 0) {
      jsonStyles[key] = value;
    }
  }
  return jsonStyles;
}

class HTMLWithComponents extends React.Component {

  static displayName = 'HTMLWithComponents';

  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.string,
    replaceSelf: PropTypes.func
  };

  componentWillMount() {
    let htmlToReactParser = new HtmlToReact.Parser(React, {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true
    });
    let processingInstructions = [
      {
        shouldProcessNode: (node) => !!ComponentRegistry(node.name),
        processNode: (node, children, index) => {
          const type = ComponentRegistry(node.name);
          let elementProps = {
            key: index,
          };
          _forEach(node.attribs, (value, key) => {
            switch (key || '') {
            case 'style':
              elementProps.style = createStyleJsonFromString(value);
              break;
            case 'class':
              elementProps.className = value;
              break;
            default:
              //Cast types for known props
              if (type.propTypes) {
                switch (type.propTypes[key]) {
                case PropTypes.bool:
                case PropTypes.bool.isRequired:
                  // If the attribute is specfied without a value, e.g. showLegend,
                  // then value will be an empty string here, which we will interpret as true.
                  // (Ordinarily, empty string values are interpreted as false in JavaScript.)
                  value = value == '' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value.toLowerCase() === '1' ? true : false;
                  break;
                case PropTypes.number:
                case PropTypes.number.isRequired:
                  value = Number(value);
                  break;
                case PropTypes.array:
                case PropTypes.array.isRequired:
                case PropTypes.object:
                case PropTypes.object.isRequired:
                  try {
                    value = JSON.parse(value);
                  } catch (e) {
                    throw Error(`Can't parse ${key} attribute for ${node.name}:${value}`);
                  }
                  break;
                  case PropTypes.string:
                    break;
                default:
                  try {
                    value = JSON.parse(value);
                  } catch (e) {
                  }
                }
              }
              elementProps[key] = value;
              break;
            }
          });

          const {replaceSelf} = this.props;
          if (type && type.propTypes && type.propTypes.replaceParent) {
            elementProps.replaceParent = replaceSelf;
          }
          return React.createElement(type, elementProps, children);
        }
      },
      {
        shouldProcessNode: (node) => true,
        processNode: new HtmlToReact.ProcessNodeDefinitions(React).processDefaultNode
      }
    ];
    let isValidNode = () => true;

    this.htmlToReact = (markupString) =>
      htmlToReactParser.parseWithInstructions(
        markupString,
        isValidNode,
        processingInstructions);
  }

  render() {
    const {children, className, ...otherProps} = this.props;
    // NOTE: wrapping avoids "Error: html-to-react currently only supports HTML with one single root element. The HTML provided contains 0 root elements. You can fix that by simply wrapping your HTML in a <div> element."
    // The original children will be inside this temporary wrapper, but now React.
    return this.htmlToReact(`<div class="${className}">${children}</div>`);
  }
}

export default HTMLWithComponents;

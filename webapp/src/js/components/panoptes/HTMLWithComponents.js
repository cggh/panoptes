import React from 'react';
import HtmlToReact from 'html-to-react';
import ComponentRegistry from 'util/ComponentRegistry';
import _forEach from 'lodash/forEach';
import _camelCase from 'lodash/camelCase';
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

let HTMLWithComponents = React.createClass({

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.string,
    replaceSelf: React.PropTypes.func
  },

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
                  case React.PropTypes.bool:
                  case React.PropTypes.bool.isRequired:
                    value = true;      //We use the usual HTML sense for boolean props - if it is defined it is true - e.g. input/checked
                    break;
                  case React.PropTypes.number:
                  case React.PropTypes.number.isRequired:
                    value = Number(value);
                    break;
                  case React.PropTypes.array:
                  case React.PropTypes.array.isRequired:
                  case React.PropTypes.object:
                  case React.PropTypes.object.isRequired:
                    try {
                      value = JSON.parse(value);
                    } catch (e) {
                      throw Error(`Can't parse ${key} attribute for ${node.name}:${value}`);
                    }
                    break;
                }
              }
              elementProps[key] = value;
              break;
            }
          });
          if (type === DocLink) {
            elementProps.replaceParent = this.props.replaceSelf;
          }
          return React.createElement(type, {children, ...elementProps});
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
  },

  render() {
    return this.htmlToReact(`<div class="${this.props.className ? this.props.className : ''}">${this.props.children}</div>`);
  }
});

export default HTMLWithComponents;

import React from 'react';
import HtmlToReact from 'html-to-react';
import ComponentRegistry from 'util/ComponentRegistry';
import _forEach from 'lodash/forEach';

function createStyleJsonFromString(styleString) {
  if (!styleString) {
    return {};
  }
  let styles = styleString.split(';');
  let singleStyle, key, value, jsonStyles = {};
  for (let i = 0; i < styles.length; i++) {
    singleStyle = styles[i].split(':');
    key = camelCase(singleStyle[0]);
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
    children: React.PropTypes.string
  },

  componentWillMount() {
    let htmlToReactParser = new HtmlToReact.Parser(React, {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true
    });
    let defaultProcess = new HtmlToReact.ProcessNodeDefinitions(React).processDefaultNode;
    let processingInstructions = [
      {
        shouldProcessNode: (node) => true,
        processNode: (node, children, index) => {
          const type = ComponentRegistry(node.name);
          if (type) {
            let elementProps = {
              key: index,
            };
            _forEach(node.attribs, function(value, key) {
              switch (key || '') {
                case 'style':
                  elementProps.style = createStyleJsonFromString(node.attribs.style);
                  break;
                case 'class':
                  elementProps.className = value;
                  break;
                default:
                  //Cast types for known props
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
                        throw Error(`Can't parse ${key} attribute for ${node.name}`);
                      }
                      break;
                  }
                  elementProps[key] = value;
                  break;
              }
            });
            return React.createElement(type, {children, ...elementProps});
          } else {
            return defaultProcess(node, children, index);
          }
        }
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
    return this.htmlToReact(`<div class="${this.props.className}">${this.props.children}</div>`);
  }
});

module.exports = HTMLWithComponents;

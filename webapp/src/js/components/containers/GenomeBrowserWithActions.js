import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _transform from 'lodash/transform';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';
import uid from 'uid';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';

import FlatButton from 'material-ui/FlatButton';
import scrollbarSize from 'scrollbar-size';


let GenomeBrowserWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    components: ImmutablePropTypes.orderedMap
  },

  getDefaultProps() {
    return {
      sidebar: true,
      chromosome: '',
      start: 0,
      end: 10000,
      components: Immutable.OrderedMap()
    };
  },

  channelGroups() {
    let groups = {
      __reference__: {
        name: 'Reference',
        icon: 'bitmap:genomebrowser.png',
        items: {}
      }
    };
    // _forEach(this.config.genome.summaryValues, (table, id) => {
    //   _forEach(table.properties, (prop) => {
    //       if (prop.showInBrowser && prop.summaryValues && (prop.isCategorical || prop.isBoolean)) {
    //         groups['__reference__'].items[prop.id] = {
    //           name: prop.name,
    //           description: prop.description,
    //           icon: prop.icon,
    //           payload: {
    //             channel: 'CategoricalChannel',
    //             props: {
    //               name: prop.name,
    //               table: `__reference__${table.id}`,
    //               track: prop.id
    //             }
    //           }
    //         };
    //       }
    //       else if (prop.showInBrowser && prop.summaryValues && prop.isNumerical) {
    //         groups['__reference__'].items[prop.id] = {
    //           name: prop.name,
    //           description: prop.description,
    //           icon: prop.icon,
    //           payload: {
    //             channel: 'NumericalTrackGroupChannel',
    //             props: {
    //               tracks: [{
    //                 track: 'NumericalSummaryTrack',
    //                 name: prop.name,
    //                 props: {
    //                   table: `__reference__${table.id}`,
    //                   track: prop.id
    //                 }
    //               }]
    //             }
    //           }
    //         };
    //       }
    //     }
    //   )
    // });

    //Normal summaries
    _forEach(this.config.tables, (table) => {
      if (table.hasGenomePositions && !table.isHidden) {
        groups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon,
          items: {
            __rows__: {
              name: table.capNamePlural,
              description: `Positions of ${table.capNamePlural}`,
              icon: 'arrow-down',
              payload: {
                channel: 'PerRowIndicatorChannel',
                props: {
                  table: table.id
                }
              }
            }
          }
        };
        _forEach(table.properties, (prop) => {
          if (prop.showInBrowser && (prop.isCategorical || prop.isBoolean)) {
            groups[table.id].items[prop.id] = {
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: {
                channel: 'CategoricalChannel',
                props: {
                  name: prop.name,
                  table: table.id,
                  track: prop.id
                }
              }
            };
          } else if (prop.showInBrowser && prop.isNumerical) {
            groups[table.id].items[prop.id] = {
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: {
                channel: 'NumericalTrackGroupChannel',
                props: {
                  tracks: [{
                    track: 'NumericalSummaryTrack',
                    name: prop.name,
                    props: {
                      table: table.id,
                      track: prop.id
                    }
                  }]
                }
              }
            };
          }
        });
      }
    });
    if (this.config.twoDTables.length > 0) {
      groups['_twoD'] = {
        name: 'Genotypes',
        icon: 'bitmap:genomebrowser.png',
        items: _transform(_filter(this.config.twoDTables, 'showInGenomeBrowser'), (result, table) => {
          result[table.id] = {
            name: table.namePlural,
            description: table.description,
            icon: 'table',
            payload: {
              channel: 'GenotypesChannel',
              props: {
                table: table.id,
              }
            }
          };
        }, {})
      };
    }

    //Per-row based summaries
    _forEach(this.config.visibleTables, (table) => {
      if (table.tableBasedSummaryValues.length > 0) {
        groups[`_per_${table.id}`] = {
          name: `Per ${table.capNameSingle}`,
          icon: table.icon,
          items: _transform(table.tableBasedSummaryValuesById, (result, channel) => {
            result[channel.id] = {
              name: channel.name,
              description: 'Description needs to be implemented',
              icon: 'line-chart',
              payload: {
                channel: 'PerRowNumericalChannel',
                props: {
                  name: channel.name,
                  table: table.id,
                  channel: channel.id
                }
              }
            };
          })
        };
      }
    });
    return Immutable.fromJS(groups);
  },


  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return this.props.title || 'Genome Browser';
  },

  handleChannelAdd(newChannels) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate(
      (props) => props.mergeIn(['channels'],
        newChannels.reduce(
          (reduction, item) => reduction.set(uid(10), item.get('payload')),
          Immutable.Map()
        )
      ));
  },

  render() {
    let actions = this.getFlux().actions;
    let {sidebar, componentUpdate, ...subProps} = this.props;
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()}
                       description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>
        <FlatButton label="Add Channels"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/ItemPicker.js',
                      {
                        title: 'Pick channels to be added',
                        itemName: 'channel',
                        itemVerb: 'add',
                        groups: this.channelGroups(),
                        onPick: this.handleChannelAdd
                      })}/>
      </div>
    );
    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
          </div>
          <GenomeBrowser componentUpdate={componentUpdate} sideWidth={150} {...subProps} />
        </div>
      </Sidebar>
    );
  }
});

module.exports = GenomeBrowserWithActions;

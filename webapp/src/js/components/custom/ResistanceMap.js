import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Card, {CardContent, CardHeader} from 'material-ui/Card';
import Typography from 'material-ui/Typography'
import filterChildren from 'util/filterChildren';
import Map from 'components/Map/Map';
import ItemTemplate from 'components/panoptes/ItemTemplate';
import TileLayer from 'components/Map/TileLayer';
import TableMarkersLayer from 'components/Map/TableMarkersLayer';
import TableMarkersLayerCustomPopup from 'components/Map/TableMarkersLayerCustomPopup';
import CustomPopup from 'components/Map/CustomPopup';
import { FormLabel, FormControl, FormControlLabel, FormHelperText } from 'material-ui/Form';
import Radio, { RadioGroup } from 'material-ui/Radio';
import FluxMixin from 'mixins/FluxMixin';

let ResistanceMap = createReactClass({
  displayName: 'ResistanceMap',

  propTypes: {
  },

  mixins: [
    FluxMixin,
  ],

  getInitialState() {
    return {
      drug: 'sites'
    };
  },

  handleChange(e, drug) {
    this.setState({drug});
  },

  render() {
    let {drug} = this.state;
    return (
      <div className="centering-container">
        <Card>
          <CardContent>
            <CardHeader title={<span>Sites with <em>P. falciparum</em> samples</span>} />
            <Typography component="p">This map shows the location of sites providing samples in this data set. Clicking a site will lead to information about that site. <br/> To view the proportion of resistant samples as a pie chart at each site, select a drug below. The number in each pie is the number of samples from that site.</Typography>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="drug"
                name="drug"
                // className={classes.group}
                value={this.state.drug}
                onChange={this.handleChange}
                style={{flexDirection: 'row'}}
              >
                <FormControlLabel value="sites" control={<Radio />} label="Sites" />
                <FormControlLabel value="ART" control={<Radio />} label="Artemisinin" />
                <FormControlLabel value="CQ" control={<Radio />} label="Chloroquine" />
                <FormControlLabel value="MQ" control={<Radio />} label="Mefloquine" />
                <FormControlLabel value="PPQ" control={<Radio />} label="Piperaquine" />
                <FormControlLabel value="PYR" control={<Radio />} label="Pyrimethamine" />
                <FormControlLabel value="SDX" control={<Radio />} label="Sulfadoxine" />
              </RadioGroup>
            </FormControl>
            <div style={{width: '80vw', height: '60vh'}}>
              <Map>
                <TileLayer/>
                {drug !== 'sites' ? <TableMarkersLayer showLegend={true}
                                           table="pf_samples"
                                           clusterMarkers={true}
                                           markerColourProperty={`${drug}resistant`}
                  /> :
                  <TableMarkersLayerCustomPopup clickPrimaryKeyProperty="site_id" disableOnClickMarker={true} showLegend={true} table="sites" clusterMarkers={false}>
                    <CustomPopup>
                      <ItemTemplate flux={this.getFlux()} table="sites">
                        {"{{name}} - {{#query 'country_id' table='pf_samples' distinct='true' query='{\"whcClass\":\"comparefixed\",\"isCompound\":false,\"ColName\":\"site_id\",\"CompValue\":\"{{site_id}}\",\"isRoot\":true,\"Tpe\":\"=\"}'}}\n" +
                        "                        <QueryResult table=\"countries\" expression='\"name\"' query='{\"whcClass\":\"comparefixed\",\"isCompound\":false,\"ColName\":\"country_id\",\"CompValue\":\"{{country_id}}\",\"isRoot\":true,\"Tpe\":\"=\"}' />\n" +
                        "                      {{/query}} <strong><QueryResult table=\"pf_samples\" query='{\"whcClass\":\"comparefixed\",\"isCompound\":false,\"ColName\":\"site_id\",\"CompValue\":\"{{site_id}}\",\"isRoot\":true,\"Tpe\":\"=\"}' /></strong> <em>P. Falciparum</em> samples from {{name}},\n" +
                        "                        contributed by <strong><QueryResult table=\"pf_samples\" expression='[\"count\", [[\"distinct\", [\"study_id\"]]]]' query='{\"whcClass\":\"comparefixed\",\"isCompound\":false,\"ColName\":\"site_id\",\"CompValue\":\"{{site_id}}\",\"isRoot\":true,\"Tpe\":\"=\"}' /></strong> studies." +
                        "<ItemLink table='sites' primKey='{{site_id}}'><Button color=\"primary\" raised label='more'></PopupButton></ItemLink>"}
                      </ItemTemplate>
                    </CustomPopup>
                  </TableMarkersLayerCustomPopup>
                }

              </Map>
            </div>
          </CardContent>
        </Card>
      </div>);
  },
});

  export default ResistanceMap;

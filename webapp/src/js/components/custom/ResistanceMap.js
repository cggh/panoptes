import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Card, {CardContent, CardHeader} from 'material-ui/Card';
import Typography from 'material-ui/Typography'
import filterChildren from 'util/filterChildren';
import Map from 'components/Map/Map';
import TileLayer from 'components/Map/TileLayer';
import TableMarkersLayer from 'components/Map/TableMarkersLayer';
import { FormLabel, FormControl, FormControlLabel, FormHelperText } from 'material-ui/Form';
import Radio, { RadioGroup } from 'material-ui/Radio';
let ResistanceMap = createReactClass({
  displayName: 'ResistanceMap',

  propTypes: {
  },

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
                  <TableMarkersLayer showLegend={true} table="sites" clusterMarkers={false}/>
                }

              </Map>
            </div>
          </CardContent>
        </Card>
      </div>);
  },
});

  export default ResistanceMap;

const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

let PanoptesActions = {
  chooseDataset() {
    this.dispatch(LAYOUT.MODAL_OPEN, {
      component: 'ui/HelloWorld',
      props: {
        msg: 'MODAL IN YOUR FACE!'
      }
    })
  }
};

module.exports = PanoptesActions;

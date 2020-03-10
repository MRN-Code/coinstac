import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import { notifyInfo } from '../../state/ducks/notifyAndLog';
import { clearRuns } from '../../state/ducks/runs';

const styles = theme => ({
  pageTitle: {
    marginBottom: theme.spacing.unit * 2,
  },
  pageSubtitle: {
    marginBottom: theme.spacing.unit,
  },
  sectionTitle: {
    marginBottom: theme.spacing.unit,
  },
  button: {
    marginTop: theme.spacing.unit,
  },
});

class Settings extends Component {
  constructor(props) {
    super(props);

    this.clearData = this.clearData.bind(this);
  }

  clearData(e) {
    e.preventDefault();
    this.props.clearRuns();
    this.props.notifyInfo('Local data cleared');
  }

  render() {
    const { classes } = this.props;

    return (
      <div className="settings">
        <div className="page-header">
          <Typography variant="h4" className={classes.pageTitle}>
            Settings
          </Typography>
        </div>
        <Typography variant="h5" className={classes.pageSubtitle}>
          Remove Data
        </Typography>
        <form method="post" onSubmit={this.clearData}>
          <Typography variant="h6" className={classes.sectionTitle}>Clear local data</Typography>
          <Typography variant="body1">
            Remove stored data on your machine, including your collections.
            <strong> This action is permanent.</strong>
          </Typography>
          <Button variant="contained" color="secondary" type="submit" className={classes.button}>
            Delete Local Data
          </Button>
        </form>
      </div>
    );
  }
}

Settings.propTypes = {
  clearRuns: PropTypes.func.isRequired,
  notifyInfo: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
};

Settings.contextTypes = {
  router: PropTypes.object.isRequired,
};

const connectedComponent = connect(null, {
  clearRuns,
  notifyInfo,
})(Settings);

export default withStyles(styles)(connectedComponent);

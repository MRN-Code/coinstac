import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, graphql, withApollo } from 'react-apollo';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import ipcPromise from 'ipc-promise';
import { services } from 'coinstac-common';
import {
  ADD_COMPUTATION_MUTATION,
} from '../../state/graphql/functions';
import { saveDocumentProp } from '../../state/graphql/props';
import { notifySuccess } from '../../state/ducks/notifyAndLog';

const styles = theme => ({
  topMargin: {
    marginTop: theme.spacing.unit,
  },
  description: {
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
});

class ComputationSubmission extends Component { // eslint-disable-line
  constructor(props) {
    super(props);

    this.state = { activeSchema: {}, submissionSuccess: null, validationErrors: null };
    this.getComputationSchema = this.getComputationSchema.bind(this);
    this.submitSchema = this.submitSchema.bind(this);
  }

  getComputationSchema(e) {
    e.preventDefault();
    ipcPromise.send('open-dialog', 'jsonschema')
      .then((res) => {
        let error = null;
        const validationReults = services.validator.validate(res, 'computation');

        if (validationReults.error) {
          error = validationReults.error.details;
        }

        this.setState({ activeSchema: res, validationErrors: error });
      })
      .catch(console.log);
  }

  submitSchema() {
    this.props.submitSchema(this.state.activeSchema)
    .then((res) => {
      this.setState({ activeSchema: {} });
      if (res.data.addComputation) {
        this.setState({ submissionSuccess: true });
        this.props.router.push('/dashboard/computations');
        this.props.notifySuccess({
          message: 'Computation Submission Successful',
          autoDismiss: 5,
        });
      } else {
        this.setState({ submissionSuccess: false });
      }
    })
    .catch(({ graphQLErrors }) => {
      console.log(graphQLErrors);
      this.setState({ submissionSuccess: false });
    });
  }

  render() {
    const { classes } = this.props;
    const { activeSchema, validationErrors, submissionSuccess } = this.state;

    return (
      <div>
        <div className="page-header">
          <Typography variant="h4">
            Computation Submission:
          </Typography>
        </div>
        <Typography variant="body1" className={classes.description}>
          Use the button below to upload your schema for review. Prior to submission,
          your schema will be validated. Please fix any errors found therein to unlock the
          <span style={{ fontWeight: 'bold' }}> Submit </span>
          for review.
        </Typography>
        <div className={classes.actionsContainer}>
          <Button
            variant="contained"
            color="secondary"
            onClick={this.getComputationSchema}
          >
            Add Computation Schema
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!activeSchema.meta || validationErrors !== null}
            onClick={this.submitSchema}
          >
            Submit
          </Button>
        </div>

        {
          validationErrors
          && (
            <div>
              <Typography variant="h6">
                Validation Error
              </Typography>
              <ul>
                {
                  validationErrors.map(error => (
                    <li key={error.path}>
                      {`Error at ${error.path}: ${error.message}`}
                    </li>
                  ))
                }
              </ul>
            </div>
          )
        }

        {
          !activeSchema.meta && submissionSuccess === false
          && (
            <Typography variant="h6">
              <strong>Error!</strong>
              Try again?
            </Typography>
          )
        }

        {
          activeSchema.meta
          && (
            <pre className={classes.topMargin}>
              {JSON.stringify(activeSchema, null, 2)}
            </pre>
          )
        }
      </div>
    );
  }
}

ComputationSubmission.propTypes = {
  notifySuccess: PropTypes.func.isRequired,
  submitSchema: PropTypes.func.isRequired,
};

const mapStateToProps = ({ notifySuccess, submitSchema }) => {
  return { notifySuccess, submitSchema };
};

const ComputationSubmissionWithAlert = compose(
  graphql(ADD_COMPUTATION_MUTATION, saveDocumentProp('submitSchema', 'computationSchema')),
  withApollo
)(ComputationSubmission);

const connectedComponent = connect(mapStateToProps, {
  notifySuccess,
})(ComputationSubmissionWithAlert);

export default withStyles(styles)(connectedComponent);

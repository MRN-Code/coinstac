import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { compose, graphql, withApollo } from 'react-apollo'
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator'
import { trim } from 'lodash'
import { Button, Typography } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'
import {
  CREATE_ISSUE_MUTATION,
} from '../../state/graphql/functions'
import {
  saveDocumentProp,
} from '../../state/graphql/props'
import { notifySuccess, notifyError } from '../../state/ducks/notifyAndLog'
import StatusButtonWrapper from '../common/status-button-wrapper'

const styles = theme => ({
  tabTitleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.unit * 2,
  },
  textField: {
    marginTop: theme.spacing.unit * 2,
  },
  membersContainer: {
    marginTop: theme.spacing.unit * 4,
  },
  addMemberContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
  addMemberButton: {
    marginLeft: theme.spacing.unit * 2,
  },
})

const INITIAL_STATE = {
  title: '',
  body: '',
  savingStatus: 'init',
}

class Issue extends Component {
  state = INITIAL_STATE

  handleChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleSubmit = () => {
    const { title, body } = this.state

    this.setState({ savingStatus: 'pending' })

    this.props.createIssue({ title: trim(title), body })
      .then(() => {
        this.setState({ ...INITIAL_STATE, savingStatus: 'success' })
        this.props.notifySuccess({ message: 'Issue is created on Github successfully' })
        this.issueCreateForm.resetValidations();
      })
      .catch(() => {
        this.setState({ savingStatus: 'fail' })
        this.props.notifyError({ message: 'Failed to create the issue on Github' })
      })
  }

  render() {
    const { classes } = this.props
    const { title, body, savingStatus } = this.state

    return (
      <ValidatorForm
        instantValidate
        noValidate
        ref={ref => this.issueCreateForm = ref}
        onSubmit={this.handleSubmit}
      >
        <div className={classes.tabTitleContainer}>
          <Typography variant="h5">
            Issue
          </Typography>
          <StatusButtonWrapper status={savingStatus}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={savingStatus === 'pending'}
            >
              Save
            </Button>
          </StatusButtonWrapper>
        </div>
        <TextValidator
          id="title"
          label="Title"
          fullWidth
          value={title}
          name="name"
          required
          validators={['required']}
          errorMessages={['Issue title is required']}
          className={classes.textField}
          withRequiredValidator
          onChange={this.handleChange('title')}
        />
        <TextValidator
          id="content"
          label="Content"
          fullWidth
          value={body}
          name="content"
          required
          multiline
          rows={10}
          validators={['required']}
          errorMessages={['Issue content is required']}
          className={classes.textField}
          withRequiredValidator
          onChange={this.handleChange('body')}
        />
      </ValidatorForm>
    )
  }
}

Issue.propTypes = { 
  createIssue: PropTypes.func.isRequired,
  notifySuccess: PropTypes.func.isRequired,
  notifyError: PropTypes.func.isRequired,
}

const IssueWithData = compose(
  graphql(CREATE_ISSUE_MUTATION, saveDocumentProp('createIssue', 'issue')),
  withApollo,
)(Issue)

const connectedComponent = connect(null, {
  notifySuccess,
  notifyError,
})(IssueWithData);

export default withStyles(styles)(connectedComponent)

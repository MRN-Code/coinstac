import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { graphql, compose, withApollo } from 'react-apollo'
import { find } from 'lodash'
import {
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
} from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'
import ThreadList from './thread-list'
import ThreadContent from './thread-content'
import ThreadNew from './thread-new'
import { ThreadContext } from './context'
import {
  getAllAndSubProp,
  saveMessageProp,
  setReadMessageProp,
  consortiaMembershipProp,
} from '../../state/graphql/props'
import {
  FETCH_ALL_COMPUTATIONS_QUERY,
  FETCH_ALL_CONSORTIA_QUERY,
  FETCH_ALL_USERS_QUERY,
  JOIN_CONSORTIUM_MUTATION,
  SAVE_MESSAGE_MUTATION,
  SET_READ_MESSAGE_MUTATION,
  CONSORTIUM_CHANGED_SUBSCRIPTION,
  USER_CHANGED_SUBSCRIPTION,
} from '../../state/graphql/functions'
import { saveAssociatedConsortia } from '../../state/ducks/collections'
import { pullComputations } from '../../state/ducks/docker'
import { notifyInfo } from '../../state/ducks/notifyAndLog'

const styles = theme => ({
  wrapper: {
    height: '100vh',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    margin: -15,
    padding: 15,
  },
  title: {
    marginBottom: theme.spacing.unit * 2,
  },
  container: {
    flex: 1,
    display: 'flex',
    border: `1px solid ${theme.palette.grey[300]}`,
  },
})

class Threads extends Component {
  state = {
    creatingNewThread: false,
    openDialog: false,
    savingStatus: 'init',
    selectedThread: null,
  }

  handleThreadClick = (threadId) => {
    const { auth } = this.props
    const { creatingNewThread } = this.state

    if (creatingNewThread) {
      this.toggleDialog(threadId)
    } else {
      this.setState({ selectedThread: threadId })
      this.props.setReadMessage({ threadId, userId: auth.user.id })
    }
  }

  handleThreadNewClick = () => {
    this.setState({ creatingNewThread: true })
  }

  handleConfirm = () => {
    this.setState({
      creatingNewThread: false,
      openDialog: false,
    })
  }

  toggleDialog = threadId => {
    const { openDialog } = this.state

    this.setState(
      Object.assign(
        { openDialog: !openDialog },
        threadId && { selectedThread: threadId },
      )
    )
  }

  handleSend = data => {
    const { creatingNewThread } = this.state

    this.setState({ savingStatus: 'pending' })

    this.props.saveMessage(data).then(res => {
      const { id } = res.data.saveMessage

      this.setState(Object.assign(
        { savingStatus: 'success' },
        creatingNewThread && {
          creatingNewThread: false,
          selectedThread: id,
        },
      ))
    }).catch(() => {
      this.setState({
        savingStatus: 'fail',
      })
    })
  }

  handleJoinConsortium = consortiumId => {
    const { auth, consortia, client, pipelines } = this.props

    const consortium = find(consortia, { id: consortiumId })

    if (!consortium) {
      return
    }

    const { members, activePipelineId } = consortium

    if (members.indexOf(auth.user.id) !== -1 || !activePipelineId) {
      this.props.router.push('/dashboard/consortia')
      return
    }

    const computationData = client.readQuery({ query: FETCH_ALL_COMPUTATIONS_QUERY })
    const pipeline = pipelines.find(cons => cons.id === activePipelineId)

    const computations = []
    pipeline.steps.forEach((step) => {
      const compObject = computationData.fetchAllComputations
        .find(comp => comp.id === step.computations[0].id)
      computations.push({
        img: compObject.computation.dockerImage,
        compId: compObject.id,
        compName: compObject.meta.name,
      })
    })

    this.props.pullComputations({ consortiumId, computations })
    this.props.notifyInfo({
      message: 'Pipeline computations downloading via Docker.',
      autoDismiss: 5,
      action: {
        label: 'View Docker Download Progress',
        callback: () => {
          this.props.router.push('/dashboard/computations')
        },
      },
    })

    this.props.saveAssociatedConsortia({ id: consortiumId, activePipelineId })
    this.props.joinConsortium(consortiumId).then(() => {
      localStorage.setItem('CONSORTIUM_JOINED_BY_THREAD', consortiumId)
      this.props.router.push('/dashboard/consortia')
    })
  }

  getSelectedThread = () => {
    const { threads } = this.props
    const { selectedThread } = this.state

    return find(threads, { id: selectedThread })
  }

  render() {
    const { auth, consortia, runs, threads, users, classes } = this.props
    const { selectedThread, creatingNewThread, openDialog, savingStatus } = this.state

    const thread = this.getSelectedThread()

    return (
      <ThreadContext.Provider
        value={{ auth, consortia, runs, threads, users }}
      >
        <div className={classes.wrapper}>
          <Typography variant="h4" className={classes.title}>
            Messages
          </Typography>
          <div className={classes.container}>
            <ThreadList
              selectedThread={selectedThread}
              onThreadClick={this.handleThreadClick}
              onThreadNewClick={this.handleThreadNewClick}
            />
            {creatingNewThread ? (
              <ThreadNew
                savingStatus={savingStatus}
                onSend={this.handleSend}
              />
            ) : (
              <ThreadContent
                thread={thread}
                savingStatus={savingStatus}
                onSend={this.handleSend}
                onJoinConsortium={this.handleJoinConsortium}
              />
            )}

            <Dialog
              open={openDialog}
              onClose={this.toggleDialog}
            >
              <DialogContent>
                <DialogContentText>
                  Are you sure to discard new message?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button autoFocus onClick={this.toggleDialog} color="primary">
                  No
                </Button>
                <Button onClick={this.handleConfirm} color="primary" autoFocus>
                  Yes
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        </div>
      </ThreadContext.Provider>
    )
  }
}

Threads.propTypes = {
  auth: PropTypes.object,
  classes: PropTypes.object.isRequired,
  client: PropTypes.object,
  consortia: PropTypes.array,
  pipelines: PropTypes.array,
  router: PropTypes.object,
  runs: PropTypes.array,
  threads: PropTypes.array,
  users: PropTypes.array,
  joinConsortium: PropTypes.func.isRequired,
  notifyInfo: PropTypes.func.isRequired,
  pullComputations: PropTypes.func.isRequired,
  saveAssociatedConsortia: PropTypes.func.isRequired,
  saveMessage: PropTypes.func.isRequired,
  setReadMessage: PropTypes.func.isRequired,
}

const ThreadsWithData = compose(
  graphql(
    SAVE_MESSAGE_MUTATION,
    saveMessageProp('saveMessage'),
  ),
  graphql(
    SET_READ_MESSAGE_MUTATION,
    setReadMessageProp('setReadMessage'),
  ),
  graphql(FETCH_ALL_USERS_QUERY, getAllAndSubProp(
    USER_CHANGED_SUBSCRIPTION,
    'users',
    'fetchAllUsers',
    'subscribeToUsers',
    'userChanged'
  )),
  graphql(FETCH_ALL_CONSORTIA_QUERY, getAllAndSubProp(
    CONSORTIUM_CHANGED_SUBSCRIPTION,
    'consortia',
    'fetchAllConsortia',
    'subscribeToConsortia',
    'consortiumChanged'
  )),
  graphql(JOIN_CONSORTIUM_MUTATION, consortiaMembershipProp('joinConsortium')),
  withApollo,
)(Threads)

const mapStateToProps = ({ auth }) => {
  return { auth }
}

const connectedComponent = connect(mapStateToProps, {
  pullComputations,
  notifyInfo,
  saveAssociatedConsortia,
})(ThreadsWithData)

export default withStyles(styles, { withTheme: true })(connectedComponent)

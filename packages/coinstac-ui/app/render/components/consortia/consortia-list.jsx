import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose, graphql, withApollo } from 'react-apollo';
import { Alert, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import shortid from 'shortid';
import MemberAvatar from '../common/member-avatar';
import ListItem from '../common/list-item';
import ListDeleteModal from '../common/list-delete-modal';
import {
  getCollectionFiles,
  getAllAssociatedConsortia,
  incrementRunCount,
  removeCollectionsFromAssociatedConsortia,
  saveAssociatedConsortia,
} from '../../state/ducks/collections';
import { saveLocalRun } from '../../state/ducks/runs';
import { updateUserPerms } from '../../state/ducks/auth';
import { pullComputations } from '../../state/ducks/docker';
import {
  CREATE_RUN_MUTATION,
  DELETE_CONSORTIUM_MUTATION,
  FETCH_ALL_COMPUTATIONS_QUERY,
  FETCH_ALL_CONSORTIA_QUERY,
  FETCH_ALL_PIPELINES_QUERY,
  JOIN_CONSORTIUM_MUTATION,
  LEAVE_CONSORTIUM_MUTATION,
} from '../../state/graphql/functions';
import {
  consortiaMembershipProp,
  removeDocFromTableProp,
  saveDocumentProp,
} from '../../state/graphql/props';
import { notifyInfo, notifyWarning } from '../../state/ducks/notifyAndLog';

const MAX_LENGTH_CONSORTIA = 50;

const styles = {
  listItemWarning: {
    color: 'orange',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  optionalButton: {
    marginLeft: 10,
  },
};

const isUserA = (userId, groupArr) => {
  return groupArr.indexOf(userId) !== -1;
};

class ConsortiaList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      memberConsortia: [],
      otherConsortia: [],
      consortiumToDelete: -1,
      showModal: false,
    };

    this.props.getAllAssociatedConsortia();

    this.getOptions = this.getOptions.bind(this);
    this.getListItem = this.getListItem.bind(this);
    this.deleteConsortium = this.deleteConsortium.bind(this);
    this.joinConsortium = this.joinConsortium.bind(this);
    this.leaveConsortium = this.leaveConsortium.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.openModal = this.openModal.bind(this);
    this.startPipeline = this.startPipeline.bind(this);
  }

  static getDerivedStateFromProps(props) {
    const { auth, consortia } = props;
    const memberConsortia = [];
    const otherConsortia = [];
    if (consortia && consortia.length <= MAX_LENGTH_CONSORTIA) {
      consortia.forEach((cons) => {
        if (cons.owners.indexOf(auth.user.id) > -1 || cons.members.indexOf(auth.user.id) > -1) {
          memberConsortia.push(cons);
        } else {
          otherConsortia.push(cons);
        }
      });
    }
    return { memberConsortia, otherConsortia };
  }

  getOptions(member, owner, consortium) {
    const actions = [];
    const text = [];
    let isMapped = false;

    if (this.props.associatedConsortia.length > 0) {
      const assocCons = this.props.associatedConsortia.find(c => c.id === consortium.id);
      if (assocCons && assocCons.isMapped) {
        isMapped = assocCons.isMapped;
      }
    }

    // Add pipeline text
    text.push(
      <p key={`${consortium.id}-active-pipeline-text`}>
        <span className="bold">Active Pipeline: </span>
        {
          consortium.activePipelineId
          ? <span style={{ color: 'green' }}>{this.props.pipelines.find(pipe => pipe.id === consortium.activePipelineId).name}</span>
          : <span style={{ color: 'red' }}> None</span>
        }
      </p>
    );

    // Add owner/member list
    const ownersIds = consortium.owners.reduce((acc, user) => {
      acc[user] = true;
      return acc;
    }, {});

    const consortiumUsers =
      consortium.owners.map(user => ({ id: user, owner: true, member: true }))
      .concat(
        consortium.members
          .filter(user => !Object.prototype.hasOwnProperty.call(ownersIds, user))
          .map(user => ({ id: user, member: true }))
      );

    const avatars = consortiumUsers
      .filter((v, i, a) => i === a.indexOf(v))
      .map((user, index) => (
        <MemberAvatar
          key={`${user.id}-avatar-${index}`}
          consRole={user.owner ? 'Owner' : 'Member'}
          name={user.id}
          showDetails
          width={40}
        />
      )
    );

    text.push(
      <div key="avatar-container">
        <span className="bold">Owner(s)/Members: </span><br />
        {avatars}
      </div>
    );

    if (owner && consortium.activePipelineId && isMapped) {
      actions.push(
        <Button
          key={`${consortium.id}-start-pipeline-button`}
          bsStyle="success"
          onClick={this.startPipeline(consortium.id, consortium.activePipelineId)}
          style={styles.optionalButton}
        >
          Start Pipeline
        </Button>
      );
    } else if (owner && !consortium.activePipelineId) {
      actions.push(
        <LinkContainer
          to={`dashboard/consortia/${consortium.id}/2`}
          key={`${consortium.id}-set-active-pipeline-button`}
        >
          <Button
            bsStyle="warning"
            style={styles.optionalButton}
          >
            Set Active Pipeline
          </Button>
        </LinkContainer>
      );
    } else if ((owner || member) && !isMapped) {
      actions.push(
        <LinkContainer
          to={`dashboard/maps/`}
          key={`${consortium.id}-set-map-local-button`}
        >
          <Button
            bsStyle="warning"
            style={styles.optionalButton}
          >
            Map Local Data
          </Button>
        </LinkContainer>
      );
    }

    if (member && !owner) {
      actions.push(
        <Button
          key={`${consortium.id}-leave-cons-button`}
          name={`${consortium.name}-leave-cons-button`}
          bsStyle="warning"
          className="pull-right"
          onClick={() => this.leaveConsortium(consortium.id)}
        >
          Leave Consortium
        </Button>
      );
    } else if (!member && !owner && consortium.activePipelineId) {
      actions.push(
        <Button
          key={`${consortium.id}-join-cons-button`}
          name={`${consortium.name}-join-cons-button`}
          bsStyle="primary"
          className="pull-right"
          onClick={() => this.joinConsortium(consortium.id, consortium.activePipelineId)}
        >
          Join Consortium
        </Button>
      );
    }

    return { actions, text, owner };
  }

  getListItem(consortium) {
    const { user } = this.props.auth;
    return (
      <ListItem
        key={`${consortium.id}-list-item`}
        itemObject={consortium}
        deleteItem={this.openModal}
        owner={isUserA(user.id, consortium.owners)}
        itemOptions={
          this.getOptions(
            isUserA(user.id, consortium.members),
            isUserA(user.id, consortium.owners),
            consortium
          )
        }
        itemRoute={'/dashboard/consortia'}
      />
    );
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  openModal(consortiumId) {
    return () => {
      this.setState({
        showModal: true,
        consortiumToDelete: consortiumId,
      });
    };
  }

  deleteConsortium() {
    this.props.removeCollectionsFromAssociatedConsortia(this.state.consortiumToDelete, true)
    .then(() => {
      this.props.deleteConsortiumById(this.state.consortiumToDelete);
      this.closeModal();
    });
  }

  joinConsortium(consortiumId, activePipelineId) {
    const { client, pipelines } = this.props;

    if (activePipelineId) {
      const computationData = client.readQuery({ query: FETCH_ALL_COMPUTATIONS_QUERY });
      const pipeline = pipelines.find(cons => cons.id === activePipelineId);

      const computations = [];
      pipeline.steps.forEach((step) => {
        const compObject = computationData.fetchAllComputations
          .find(comp => comp.id === step.computations[0].id);
        computations.push({
          img: compObject.computation.dockerImage,
          compId: compObject.id,
          compName: compObject.meta.name,
        });
      });

      this.props.pullComputations({ consortiumId, computations });
      this.props.notifyInfo({
        message: 'Pipeline computations downloading via Docker.',
        autoDismiss: 5,
        action: {
          label: 'View Docker Download Progress',
          callback: () => {
            this.props.router.push('/dashboard/computations');
          },
        },
      });
    }

    this.props.saveAssociatedConsortia({ id: consortiumId, activePipelineId });
    this.props.joinConsortium(consortiumId);
  }

  leaveConsortium(consortiumId) {
    this.props.removeCollectionsFromAssociatedConsortia(consortiumId, true)
    .then(() => {
      this.props.leaveConsortium(consortiumId);
    });
  }

  startPipeline(consortiumId, activePipelineId) {
    return () => {
      const { client, router } = this.props;
      let isRemotePipeline = false;
      const pipelineData = client.readQuery({ query: FETCH_ALL_PIPELINES_QUERY });
      const pipeline = pipelineData.fetchAllPipelines
        .find(pipe => pipe.id === activePipelineId);

      for (let i = 0; i < pipeline.steps.length; i += 1) {
        if (pipeline.steps[i].controller.type === 'decentralized') {
          isRemotePipeline = true;
          break;
        }
      }

      // Don't send local pipelines to Rethink
      if (!isRemotePipeline) {
        const data = client.readQuery({ query: FETCH_ALL_CONSORTIA_QUERY });
        const consortium = data.fetchAllConsortia.find(cons => cons.id === consortiumId);
        let run = {
          id: `local-${shortid.generate()}`,
          clients: [...consortium.members, ...consortium.owners],
          consortiumId,
          pipelineSnapshot: pipeline,
          startDate: Date.now(),
          type: 'local',
          results: null,
          endDate: null,
          userErrors: null,
          __typename: 'Run',
        };

        let status = 'started';
        return this.props.getCollectionFiles(
          consortiumId,
          consortium.name,
          run.pipelineSnapshot.steps
        )
        .then((filesArray) => {
          if ('error' in filesArray) {
            status = 'needs-map';
            this.props.notifyWarning({
              message: filesArray.error,
              autoDismiss: 5,
            });
          } else {
            this.props.notifyInfo({
              message: `Local Pipeline Starting for ${consortium.name}.`,
              action: {
                label: 'Watch Progress',
                callback: () => {
                  router.push('dashboard');
                },
              },
            });

            if ('steps' in filesArray) {
              run = {
                ...run,
                pipelineSnapshot: {
                  ...run.pipelineSnapshot,
                  steps: filesArray.steps,
                },
              };
            }

            run.status = status;

            this.props.incrementRunCount(consortiumId);
            ipcRenderer.send('start-pipeline', { consortium, pipeline, filesArray: filesArray.allFiles, run });
          }

          this.props.saveLocalRun({ ...run, status });
        });
      }

      // If remote pipeline, call GraphQL to create new pipeline
      this.props.createRun(consortiumId);
    };
  }

  render() {
    const {
      consortia,
    } = this.props;
    const {
      memberConsortia,
      otherConsortia,
    } = this.state;

    return (
      <div>
        <div className="page-header clearfix">
          <h1 className="nav-item-page-title">Consortia</h1>
          <LinkContainer className="pull-right" to="/dashboard/consortia/new">
            <Button bsStyle="primary" className="pull-right">
              <span aria-hidden="true" className="glyphicon glyphicon-plus" />
              {' '}
              Create Consortium
            </Button>
          </LinkContainer>
        </div>

        {consortia && consortia.length && consortia.length > MAX_LENGTH_CONSORTIA
          && consortia.map(consortium => this.getListItem(consortium))
        }
        {memberConsortia.length > 0 && <h4>Member Consortia</h4>}
        {memberConsortia.length > 0 &&
          memberConsortia.map(consortium => this.getListItem(consortium))
        }
        {otherConsortia.length > 0 && <h4>Other Consortia</h4>}
        {otherConsortia.length > 0 &&
          otherConsortia.map(consortium => this.getListItem(consortium))
        }

        {(!consortia || !consortia.length) &&
          <Alert bsStyle="info">
            No consortia found
          </Alert>
        }
        <ListDeleteModal
          close={this.closeModal}
          deleteItem={this.deleteConsortium}
          itemName="consortium"
          show={this.state.showModal}
          warningMessage="All pipelines associated with this consortium will also be deleted"
        />
      </div>
    );
  }
}

ConsortiaList.propTypes = {
  associatedConsortia: PropTypes.array.isRequired,
  auth: PropTypes.object.isRequired,
  client: PropTypes.object.isRequired,
  consortia: PropTypes.array.isRequired,
  createRun: PropTypes.func.isRequired,
  deleteConsortiumById: PropTypes.func.isRequired,
  getCollectionFiles: PropTypes.func.isRequired,
  getAllAssociatedConsortia: PropTypes.func.isRequired,
  incrementRunCount: PropTypes.func.isRequired,
  joinConsortium: PropTypes.func.isRequired,
  leaveConsortium: PropTypes.func.isRequired,
  notifyInfo: PropTypes.func.isRequired,
  notifyWarning: PropTypes.func.isRequired,
  pipelines: PropTypes.array.isRequired,
  pullComputations: PropTypes.func.isRequired,
  removeCollectionsFromAssociatedConsortia: PropTypes.func.isRequired,
  router: PropTypes.object.isRequired,
  saveAssociatedConsortia: PropTypes.func.isRequired,
  saveLocalRun: PropTypes.func.isRequired,
};

const mapStateToProps = ({ auth, collections: { associatedConsortia } }) => {
  return { auth, associatedConsortia };
};

const ConsortiaListWithData = compose(
  graphql(CREATE_RUN_MUTATION, saveDocumentProp('createRun', 'consortiumId')),
  graphql(DELETE_CONSORTIUM_MUTATION, removeDocFromTableProp(
    'consortiumId',
    'deleteConsortiumById',
    FETCH_ALL_CONSORTIA_QUERY,
    'fetchAllConsortia'
  )),
  graphql(JOIN_CONSORTIUM_MUTATION, consortiaMembershipProp('joinConsortium')),
  graphql(LEAVE_CONSORTIUM_MUTATION, consortiaMembershipProp('leaveConsortium')),
  withApollo
)(ConsortiaList);

export default connect(mapStateToProps,
  {
    getCollectionFiles,
    getAllAssociatedConsortia,
    incrementRunCount,
    notifyInfo,
    notifyWarning,
    pullComputations,
    removeCollectionsFromAssociatedConsortia,
    saveAssociatedConsortia,
    saveLocalRun,
    updateUserPerms,
  }
)(ConsortiaListWithData);

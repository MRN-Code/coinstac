import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import Icon from '@material-ui/core/Icon';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import DeleteIcon from '@material-ui/icons/Delete';
import ipcPromise from 'ipc-promise';
import PropTypes from 'prop-types';
import shortid from 'shortid';
import { unmapAssociatedConsortia } from '../../state/ducks/collections';
import bitap from 'bitap';
import classNames from 'classnames';

const styles = theme => ({
  addFileGroupButton: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
  },
  removeFileGroupButton: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
  },
  rootPaper: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    marginTop: theme.spacing.unit * 2,
    height: '100%',
  },
  fileErrorPaper: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
    backgroundColor: '#fef7e4',
    textAlign: 'center',
  },
  fileErrorMessage: {
    color: '#ab8e6b',
  },
  actionsContainer: {
    marginTop: theme.spacing.unit * 2,
  },
  timesIcon: {
    color: '#f05a29 !important',
    fontSize: '1.25rem',
    position: 'absolute',
    top: '-0.75rem',
    right: '-0.75rem',
    background: 'white',
    borderRadius: '50%',
    border: '2px solid white',
    width: '1.5rem',
    height: '1.5rem',
  },
});

class MapsCollection extends Component {

  constructor(props) {
    super(props);

    this.state = {
      autoMap: false,
      contChildren: 0,
      filesError: null,
      newFile: {
        open: false,
        org: 'metafile',
      },
      showFiles: {},
      source: {},
      finishedAutoMapping: false,
    };

    this.addFileGroup = this.addFileGroup.bind(this);
    this.removeFileGroup = this.removeFileGroup.bind(this);
    this.updateNewFileOrg = this.updateNewFileOrg.bind(this);
    this.updateMapsStep = this.updateMapsStep.bind(this);
    this.setStepIO = this.setStepIO.bind(this);
  }

  componentDidUpdate(prevProps,prevState) {
    if(this.refs.Container){
      let children = 0;
      let Container = ReactDOM.findDOMNode(this.refs.Container);
      children = Container.children.length;
      if(prevState.contChildren !== children){
        this.setState(prevState => ({
          contChildren: children
        }));
      }
      this.props.getContainers(Container);
    }
  }

  addFileGroup() {
    ipcPromise.send('open-dialog', 'metafile')
    .then((obj) => {

      let newFiles;

      const fileGroupId = shortid.generate();

      if (obj.error) {
        this.setState({ filesError: obj.error });
      } else {
        const name = `Group ${Object.keys(this.props.collection.fileGroups).length + 1} (${obj.extension.toUpperCase()})`;
        if (this.state.newFile.org === 'metafile') {
          let headerArray = obj.metaFile[0];
          let rowArray = [...headerArray];
          this.props.setRowArray(rowArray);
          newFiles = {
            ...obj,
            name,
            id: fileGroupId,
            date: new Date().getTime(),
            firstRow: obj.metaFile[0].join(', '),
            org: this.state.newFile.org,
          };
        } else {
          newFiles = {
            name,
            id: fileGroupId,
            extension: obj.extension,
            files: [...obj.paths.sort(naturalSort)],
            date: new Date().getTime(),
            org: this.state.newFile.org,
          };

          this.setState({ showFiles: { [newFiles.date]: false } });
        }

        this.setState({ filesError: null });
        this.props.updateCollection(
          {
            fileGroups: {
              ...this.props.collection.fileGroups,
              [fileGroupId]: newFiles,
            },
          },
          this.props.saveCollection
        );
      }
    })
    .catch(console.log);
  }

 filterGetObj(arr, string) {
    return arr.filter(function(obj) {
      return Object.keys(obj).some(function(key) {
        let objkey = obj[key];
        if(typeof objkey === 'string'){
          let fuzzy = [];
          if(string.length > objkey.length){
            fuzzy = bitap(string.toLowerCase(), objkey.toLowerCase(), 1);
          }else{
            fuzzy = bitap(objkey.toLowerCase(), string.toLowerCase(), 1);
          }
          if(fuzzy[0] > 1){
            return obj[key];
          }
        }
      })
    });
  }

  filterGetIndex(arr, string) {
     return arr.findIndex(function(obj) {
       return Object.keys(obj).some(function(key) {
         let objkey = obj[key];
         if(typeof objkey === 'string'){
           let fuzzy = [];
           if(string.length > objkey.length){
             fuzzy = bitap(string.toLowerCase(), objkey.toLowerCase(), 1);
           }else{
             fuzzy = bitap(objkey.toLowerCase(), string.toLowerCase(), 1);
           }
           if(fuzzy[0] > 1){
             return obj[key];
           }
         }
       })
     });
   }

   async autoMap(group) {
     let inputMap = this.props.activeConsortium.pipelineSteps[0].inputMap;
     let resolveAutoMapPromises = Object.entries(inputMap).map((item, i) => {
       let type = item[0];
       let obj = item[1].ownerMappings;
       const steps = this.makePoints(group.firstRow).map(async (string, index) => {
        if( obj && Object.keys(this.filterGetObj(obj,string)).length > 0 ){
         await this.setStepIO(
           index,
           group.id,
           0,
           type,
           this.filterGetIndex(obj,string),
           string
         );
        }
       });

       return Promise.all(steps);
     });
     await Promise.all(resolveAutoMapPromises);
     this.setState({ finishedAutoMapping: true });
   }


  removeFileGroup(groupId) {
    return () => {
      const groups = { ...this.props.collection.fileGroups };
      delete groups[groupId];

      // Props delete assocCons featuring groupId
      this.props.unmapAssociatedConsortia(this.props.collection.associatedConsortia)
      .then(() => {
        this.props.updateCollection(
          {
            fileGroups: { ...groups },
            associatedConsortia: [],
          },
          this.props.saveCollection
        );
      });
    };
  }

  setStepIO(i, groupId, stepIndex, objKey, index, string) {
    const { collection, rowArray, updateConsortiumClientProps } = this.props;
    let timeout = ((i + 1) * 250);
    let varObject = [{
      'collectionId': collection.id,
      'groupId': groupId,
      'column':  string
    }];
    return new Promise((resolve) => {
      setTimeout(() => {
        updateConsortiumClientProps(stepIndex, objKey, index, varObject);
        rowArray.splice( rowArray.indexOf(string), 1 );
        this.props.setRowArray(rowArray);
        resolve();
      }, timeout);
    })
  }

  updateNewFileOrg(ev) {
    this.setState({ newFile: { ...this.state.newFile, org: ev.target.value } });
  }

  updateMapsStep(){
    this.props.updateMapsStep(true);
  }

  makePoints = ((str) => {
    str = str.split(", ");
    return str.sort();
  });

  render() {
    const {
      activeConsortium,
      collection,
      isMapped,
      saveCollection,
      rowArray,
      rowArrayLength,
      classes,
    } = this.props;

    const {
      autoMap,
      contChildren,
      filesError,
      finishedAutoMapping,
    } = this.state;

    return (
      <div>
        <form onSubmit={saveCollection}>
          {
            !isMapped
            && (
              <div>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.addFileGroupButton}
                  onClick={this.addFileGroup}
                >
                  Add Files Group
                </Button>
                <Divider />
              </div>
            )
          }
          {
            filesError
            && (
              <Paper className={classes.fileErrorPaper}>
                <Typography variant="h6" className={classes.fileErrorMessage}>File Error</Typography>
                <Typography className={classes.fileErrorMessage} variant="body1">
                  {filesError}
                </Typography>
              </Paper>
            )
          }

          {
            collection.fileGroups
            && Object.values(collection.fileGroups).map(group => (
              <Paper
                key={`${group.date}-${group.extension}-${group.id}`}
                className={classes.rootPaper}
              >
                {
                  group.org === 'metafile'
                  && (
                    <div>
                      {
                        !isMapped
                        && (
                          <Button
                            variant="contained"
                            color="secondary"
                            className={classes.removeFileGroupButton}
                            onClick={this.removeFileGroup(group.id)}
                          >
                            <DeleteIcon />
                            Remove File Group
                          </Button>
                        )
                      }
                      <Typography>
                        <span className="bold">Name:</span> {group.name}
                      </Typography>
                      <Typography>
                        <span className="bold">Date:</span> {new Date(group.date).toUTCString()}
                      </Typography>
                      <Typography>
                        <span className="bold">Extension:</span> {group.extension}
                      </Typography>
                      <Typography>
                        <span className="bold">Meta File Path:</span> {group.metaFilePath}
                      </Typography>
                      <Typography>
                        <span className="bold">First Row:</span> {group.firstRow}
                      </Typography>
                      {
                        rowArray.length > 0
                        && (
                          <div className="card-deck" ref="Container">
                            {
                              rowArray && rowArray.map((point, index) => (
                                <div
                                  className={`card-draggable card-${point.toLowerCase()}`}
                                  data-filegroup={group.id}
                                  data-string={point}
                                  key={index}
                                >
                                  <FileCopyIcon /> {point}
                                  <span onClick={()=>{this.props.removeRowArrItem(point)}}>
                                    <Icon
                                      className={classNames('fa fa-times-circle', classes.timesIcon)} />
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        )
                      }
                      <Divider />
                      <div className={classes.actionsContainer}>
                        {
                          !isMapped
                          && rowArray.length * contChildren > 0
                          && (
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => this.autoMap(group)}
                            >
                              Auto Map
                            </Button>
                          )
                        }
                        {
                          !isMapped
                          && rowArrayLength * contChildren === 0
                          && (
                            <div>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => this.props.saveAndCheckConsortiaMapping()}
                              >
                                Save
                              </Button>
                              &nbsp;
                              <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => this.props.resetPipelineSteps(this.makePoints(group.firstRow))}
                              >
                                Clear Mapping
                              </Button>
                            </div>
                          )
                        }
                        {
                          isMapped
                          && (
                            <div>
                              <div className="alert alert-success" role="alert">
                                Mapping Complete!
                              </div>
                              <br />
                              <Button
                                variant="contained"
                                color="primary"
                                to="/dashboard/consortia"
                                component={Link}
                              >
                                Back to Consortia
                              </Button>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  )
                }
              </Paper>
            ))
          }
        </form>
      </div>
    );
  }
}

MapsCollection.propTypes = {
  collection: PropTypes.object,
  saveCollection: PropTypes.func.isRequired,
  saveAndCheckConsortiaMapping: PropTypes.func.isRequired,
  updateConsortiumClientProps: PropTypes.func.isRequired,
  unmapAssociatedConsortia: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
};

MapsCollection.defaultProps = {
  collection: null,
};

const connectedComponent = connect(null, { unmapAssociatedConsortia })(MapsCollection);

export default withStyles(styles)(connectedComponent);

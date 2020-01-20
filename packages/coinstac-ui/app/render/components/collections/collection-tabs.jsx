import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import { Tab, Tabs } from 'react-bootstrap';
import CollectionAbout from './collection-about';
import CollectionFiles from './collection-files';
import CollectionConsortia from './collection-consortia';
import { getAssociatedConsortia, incrementRunCount, saveAssociatedConsortia, saveCollection } from '../../state/ducks/collections';
import { getRunsForConsortium, saveLocalRun } from '../../state/ducks/runs';
import { notifyInfo, notifySuccess } from '../../state/ducks/notifyAndLog';

const styles = {
  tab: {
    marginTop: 10,
  },
};

class CollectionTabs extends Component {
  constructor(props) {
    super(props);

    const { collections, params } = props;
    let collection = {
      name: '',
      description: '',
      fileGroups: {},
      associatedConsortia: [],
    };

    if (collections.length > 0 && params.collectionId) {
      collection = collections.find(col => col.id.toString() === params.collectionId);
      this.props.getAssociatedConsortia(collection.associatedConsortia);
    } else {
      this.props.getAssociatedConsortia([]);
    }

    this.state = {
      collection,
    };

    this.saveCollection = this.saveCollection.bind(this);
    this.updateAssociatedConsortia = this.updateAssociatedConsortia.bind(this);
    this.updateCollection = this.updateCollection.bind(this);
  }

  saveCollection(e) {
    if (e) {
      e.preventDefault();
    }

    this.props.saveCollection(this.state.collection);
    this.props.notifySuccess({
      message: 'Collection Saved.',
    });
  }

  updateAssociatedConsortia(cons) {
    if (this.state.collection.associatedConsortia.indexOf(cons.id) === -1) {
      this.setState(prevState => ({
        collection: {
          ...prevState.collection,
          error: '',
          associatedConsortia: [...prevState.collection.associatedConsortia, cons.id],
        },
      }),
      () => {
        this.props.saveCollection(this.state.collection);
      });
    }
  }

  updateCollection(updateObj, callback) {
    this.setState(prevState => ({
      collection: { ...prevState.collection, ...updateObj },
    }), callback);
  }

  render() {
    const title = this.state.collection.name
      ? this.state.collection.name
      : 'New Collection';

    return (
      <div>
        <div className="page-header clearfix">
          <h1 className="pull-left">{title}</h1>
        </div>
        <Tabs defaultActiveKey={1} id="collection-tabs">
          <Tab eventKey={1} title="About" style={styles.tab}>
            <CollectionAbout
              collection={this.state.collection}
              saveCollection={this.saveCollection}
              updateCollection={this.updateCollection}
            />
          </Tab>
          {typeof this.state.collection.id !== 'undefined' ?
            <Tab
              eventKey={2}
              title="Files"
              style={styles.tab}
            >
              <CollectionFiles
                collection={this.state.collection}
                saveCollection={this.saveCollection}
                updateCollection={this.updateCollection}
              />
            </Tab>
          : ''}
          {typeof this.state.collection.id !== 'undefined' ?
            <Tab
              eventKey={3}
              title="Consortia"
              style={styles.tab}
            >
              <CollectionConsortia
                associatedConsortia={this.props.activeAssociatedConsortia}
                collection={this.state.collection}
                consortia={this.props.consortia}
                saveCollection={this.saveCollection}
                updateAssociatedConsortia={this.updateAssociatedConsortia}
                updateCollection={this.updateCollection}
              />
            </Tab>
          : ''}
        </Tabs>
      </div>
    );
  }
}

CollectionTabs.defaultProps = {
  activeAssociatedConsortia: [],
};

CollectionTabs.propTypes = {
  activeAssociatedConsortia: PropTypes.array,
  collections: PropTypes.array.isRequired,
  consortia: PropTypes.array.isRequired,
  getAssociatedConsortia: PropTypes.func.isRequired,
  getRunsForConsortium: PropTypes.func.isRequired,
  incrementRunCount: PropTypes.func.isRequired,
  notifyInfo: PropTypes.func.isRequired,
  notifySuccess: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
  router: PropTypes.object.isRequired,
  saveAssociatedConsortia: PropTypes.func.isRequired,
  saveCollection: PropTypes.func.isRequired,
  saveLocalRun: PropTypes.func.isRequired,
};

function mapStateToProps({ collections: { activeAssociatedConsortia, collections } }) {
  return { activeAssociatedConsortia, collections };
}

export default connect(mapStateToProps,
  {
    getAssociatedConsortia,
    getRunsForConsortium,
    incrementRunCount,
    notifyInfo,
    notifySuccess,
    saveAssociatedConsortia,
    saveCollection,
    saveLocalRun,
  }
)(CollectionTabs);

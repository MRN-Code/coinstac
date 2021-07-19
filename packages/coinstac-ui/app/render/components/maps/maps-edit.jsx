import React, { useState, useEffect } from 'react';
import { graphql, withApollo } from '@apollo/react-hoc';
import { flowRight as compose } from 'lodash';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import MapsEditForm from './maps-edit-form';
import { saveDataMapping } from '../../state/ducks/maps';
import {
  UPDATE_CONSORTIUM_MAPPED_USERS_MUTATION,
} from '../../state/graphql/functions';

function MapsEdit({
  params, maps, pipelines, consortia, saveDataMapping, updateConsortiumMappedUsers,
}) {
  const [saved, setSaved] = useState(false);
  const [consortium, setConsortium] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [dataMap, setDataMap] = useState({});

  useEffect(() => {
    const consortium = consortia.find(c => c.id === params.consortiumId);
    setConsortium(consortium);

    const pipeline = pipelines.find(p => p.id === consortium.activePipelineId);
    setPipeline(pipeline);

    const consortiumDataMap = maps.find(
      m => m.consortiumId === consortium.id && m.pipelineId === consortium.activePipelineId
    );

    if (consortiumDataMap) {
      setDataMap(consortiumDataMap.dataMap);
    }
  }, []);

  function onChange(fieldName, fieldData) {
    setDataMap({ ...dataMap, [fieldName]: fieldData });
    setSaved(false);
  }

  function commitSaveDataMap(e) {
    e.preventDefault();

    saveDataMapping(consortium.id, pipeline, dataMap);
    updateConsortiumMappedUsers(consortium.id, true);
    setSaved(true);
  }

  return (
    <div>
      <div className="page-header">
        <Typography variant="h4">
          { `Map - ${consortium && consortium.name}` }
        </Typography>
      </div>
      <MapsEditForm
        consortiumId={consortium && consortium.id}
        pipeline={pipeline}
        dataMap={dataMap}
        onChange={onChange}
        onSubmit={commitSaveDataMap}
        saved={saved}
      />
    </div>
  );
}

MapsEdit.propTypes = {
  consortia: PropTypes.array.isRequired,
  maps: PropTypes.array.isRequired,
  params: PropTypes.object.isRequired,
  pipelines: PropTypes.array.isRequired,
  saveDataMapping: PropTypes.func.isRequired,
  updateConsortiumMappedUsers: PropTypes.func.isRequired,
};

const mapStateToProps = ({ auth, maps }) => ({
  auth,
  maps: maps.consortiumDataMappings,
});

const ComponentWithData = compose(
  graphql(
    UPDATE_CONSORTIUM_MAPPED_USERS_MUTATION, {
      props: ({ mutate }) => ({
        updateConsortiumMappedUsers: (consortiumId, isMapped) => mutate({
          variables: { consortiumId, isMapped },
        }),
      }),
    }
  ),
  withApollo
)(MapsEdit);

export default connect(mapStateToProps,
  {
    saveDataMapping,
  })(ComponentWithData);

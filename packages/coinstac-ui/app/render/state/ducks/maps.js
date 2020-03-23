import { dirname, join, isAbsolute, resolve } from 'path';
import { applyAsyncLoading } from './loading';

const SAVE_DATA_MAPPING = 'SAVE_DATA_MAPPING';
const DELETE_DATA_MAPPING = 'DELETE_DATA_MAPPING';
const DELETE_ALL_DATA_MAPPINGS_FROM_CONSORTIUM = 'DELETE_ALL_DATA_MAPPINGS_FROM_CONSORTIUM';

const INITIAL_STATE = {
  consortiumDataMappings: [],
};

export const saveDataMapping = applyAsyncLoading(
  (consortiumId, pipelineId, mappings, dataFile) => async (dispatch) => {
    if (dataFile.extension === '.csv') {
      const csvLines = [...dataFile.metaFile];
      csvLines.shift();

      const files = csvLines.map((csvLine) => {
        const file = csvLine[0];
        return isAbsolute(file) ? file : resolve(join(dirname(dataFile.metaFilePath), file));
      });

      dataFile.files = files;
    }

    const map = {
      consortiumId,
      pipelineId,
      dataType: dataFile.dataType,
      dataMappings: mappings,
      data: [{
        allFiles: dataFile.files,
        filesData: [],
      }],
    };

    const mappedColumns = [];

    if (dataFile.dataType === 'array') {
      map.data[0].baseDirectory = dirname(dataFile.metaFilePath);
      map.data[0].metaFilePath = dataFile.metaFilePath;

      Object.keys(mappings[0]).forEach((fieldsetName) => {
        mappings[0][fieldsetName].forEach((field) => {
          const mappedColumn = {
            name: field.dataFileFieldName,
            index: dataFile.metaFile[0].findIndex(c => c === field.dataFileFieldName),
          };

          mappedColumns.push(mappedColumn);
        });
      });

      dataFile.metaFile.forEach((dataRow, index) => {
        // first row is the header
        if (index === 0) {
          return;
        }

        const parsedRow = {};

        mappedColumns.forEach((mappedColumn) => {
          parsedRow[mappedColumn.name] = dataRow[mappedColumn.index];
        });

        map.data[0].filesData.push(parsedRow);
      });
    }

    dispatch(({
      type: SAVE_DATA_MAPPING,
      payload: map,
    }));
  }
);

export const deleteDataMapping = applyAsyncLoading(
  (consortiumId, pipelineId) => async (dispatch) => {
    dispatch(({
      type: DELETE_DATA_MAPPING,
      payload: {
        consortiumId,
        pipelineId,
      },
    }));
  }
);

export const deleteAllDataMappingsFromConsortium = applyAsyncLoading(
  consortiumId => async (dispatch) => {
    dispatch(({
      type: DELETE_ALL_DATA_MAPPINGS_FROM_CONSORTIUM,
      payload: consortiumId,
    }));
  }
);

export default function reducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SAVE_DATA_MAPPING:
      return {
        ...state,
        consortiumDataMappings: [...state.consortiumDataMappings, action.payload],
      };
    case DELETE_DATA_MAPPING:
      return {
        ...state,
        consortiumDataMappings: state.consortiumDataMappings
          .filter(map => map.consortiumId !== action.payload.consortiumId
            || map.pipelineId !== action.payload.pipelineId),
      };
    case DELETE_ALL_DATA_MAPPINGS_FROM_CONSORTIUM:
      return {
        ...state,
        consortiumDataMappings: state.consortiumDataMappings
          .filter(map => map.consortiumId !== action.payload),
      };
    default:
      return state;
  }
}

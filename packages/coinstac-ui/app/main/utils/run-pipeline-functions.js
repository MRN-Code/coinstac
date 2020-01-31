const { resolve, extname, sep } = require('path');

function stepInputNeedsDataMapping(inputSchema) {
  return 'ownerMappings' in inputSchema;
}

function stepInputMapSchemaHasOptions(inputMapSchemaKeys) {
  return inputMapSchemaKeys.includes('data') && inputMapSchemaKeys.findIndex(element => element.includes('options'))
    && !inputMapSchemaKeys.includes('covariates') && !inputMapSchemaKeys.includes('file');
}

function parseValue(value, type) {
  const val = value.toLowerCase();

  switch (type) {
    case 'boolean':
      return val === 'true';
    case 'number':
      return parseFloat(val);
    default:
      return null;
  }
}

function inputSchemaHasFileSource(inputSchemaObj) {
  return inputSchemaObj.source === 'file';
}

function encodeFilePath(filePath) {
  const escape = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // eslint-disable-line no-useless-escape
  };
  const pathsep = new RegExp(`${escape(sep)}|:`, 'g');

  if (filePath.includes(sep)) {
    return filePath.replace(pathsep, '-');
  }

  return null;
}

function mapVariablesIntoArray(inputSchema, dataMappings, data, baseDirectory) {
  const dataArray = [];
  const variablesArray = [];
  const variablesTypesArray = [];

  const variablesTypes = {};

  inputSchema.ownerMappings.forEach((variable) => {
    const mapping = dataMappings.find(m => m.pipelineVariableName === variable.name);
    variablesTypes[mapping.dataFileFieldName] = variable.type;
  });

  const headerRow = Object.keys(data[0])
    .sort((a, b) => {
      if (!(a in variablesTypes)) {
        return -1;
      }

      if (!(b in variablesTypes)) {
        return 1;
      }

      return a < b ? -1 : 1;
    });

  dataArray.push(headerRow);

  data.forEach((dataRow) => {
    const row = [];

    headerRow.forEach((headerColumn) => {
      let value = dataRow[headerColumn];

      if (headerColumn in variablesTypes) {
        value = parseValue(value, variablesTypes[headerColumn]);
      } else {
        const escape = (string) => {
          return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // eslint-disable-line no-useless-escape
        };
        const pathsep = new RegExp(`${escape(sep)}|:`, 'g');
        if (extname(value) !== '') {
          value = resolve(baseDirectory, value).replace(pathsep, '-');
        }
      }

      row.push(value);
    });

    dataArray.push(row);
  });

  headerRow.forEach((headerColumn) => {
    if (headerColumn in variablesTypes) {
      variablesArray.push(headerColumn);
      variablesTypesArray.push(variablesTypes[headerColumn]);
    }
  });

  return [
    [dataArray],
    variablesArray,
    variablesTypesArray,
  ];
}

function parsePipelineInput(pipeline, dataMappings) {
  const firstStepData = dataMappings.data[0];

  const steps = [];

  pipeline.steps.forEach((step, stepIndex) => {
    const consortiumMappedStepData = dataMappings.dataMappings[stepIndex];

    if (!consortiumMappedStepData) {
      throw new Error('Data was not mapped for at least one of the computation steps');
    }

    const inputMapSchema = { ...step.inputMap };
    const inputMapSchemaKeys = Object.keys(inputMapSchema);

    inputMapSchemaKeys.forEach((inputSchemaKey) => {
      const inputSchema = step.inputMap[inputSchemaKey];

      if (!stepInputNeedsDataMapping(inputSchema)) {
        return;
      }

      let keyArray = [[], [], []]; // [[values], [labels], [type (if present)]]
      const firstInputSchemaObj = inputSchema.ownerMappings[0];

      if (stepInputMapSchemaHasOptions(inputMapSchemaKeys)) {
        const pathsArray = dataMappings.data[stepIndex].allFiles;
        const paths = pathsArray
          .map(path => encodeFilePath(path))
          .filter(Boolean);
        keyArray.push(paths);
      } else if (inputSchemaHasFileSource(firstInputSchemaObj)) {
        keyArray = mapVariablesIntoArray(inputSchema, consortiumMappedStepData[inputSchemaKey],
          dataMappings.data[stepIndex].filesData, dataMappings.data[stepIndex].baseDirectory);
      } else {
        const filePaths = dataMappings.data[stepIndex].allFiles
          .map(path => encodeFilePath(path))
          .filter(Boolean);

        keyArray[0] = keyArray[0].concat(filePaths);
        keyArray[1].push(firstInputSchemaObj.type);
        if ('value' in firstInputSchemaObj) {
          keyArray[2] = keyArray[2].concat(firstInputSchemaObj.value);
        }
      }

      // remove empty array items if present
      keyArray = keyArray.filter((item) => {
        return item.length !== 0;
      });

      if (keyArray.length === 1) {
        // eslint-disable-next-line prefer-destructuring
        inputMapSchema[inputSchemaKey].value = keyArray[0];
      } else {
        inputMapSchema[inputSchemaKey] = { value: keyArray };
      }
    });

    steps.push({
      ...step,
      inputMap: inputMapSchema,
    });
  });

  return {
    filesArray: firstStepData.allFiles,
    steps,
  };
}

module.exports = {
  parsePipelineInput,
};

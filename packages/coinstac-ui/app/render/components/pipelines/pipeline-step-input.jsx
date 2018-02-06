import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Col,
  ControlLabel,
  Checkbox,
  DropdownButton,
  FormGroup,
  FormControl,
  MenuItem,
  Row,
} from 'react-bootstrap';
import update from 'immutability-helper';
import PipelineStepVariableTable from './pipeline-step-variable-table';

const styles = {
  covariateColumns: { textAlign: 'center' },
};

export default class PipelineStepInput extends Component {
  constructor(props) {
    super(props);

    this.addCovariate = this.addCovariate.bind(this);
    this.getNewObj = this.getNewObj.bind(this);
    this.getSourceMenuItem = this.getSourceMenuItem.bind(this);
  }

  componentWillMount() {
    const { objKey, objParams, step, updateStep } = this.props;

    // Initialize array of length input min if array of inputs required
    if (!step.inputMap[objKey] && objParams.type === 'array' &&
        !objParams.values) {
      let initArray = [];

      if (objParams.defaultValue && Array.isArray(objParams.defaultValue)) {
        initArray = Array.from({ length: objParams.min }, (v, i) => objParams.defaultValue[i]);
      }

      updateStep({
        ...step,
        inputMap: this.getNewObj(
          objKey,
          initArray
        ),
      });
    }
  }

  getNewObj(objKey, value, covarIndex) { // eslint-disable-line class-methods-use-this
    const { isCovariate, step: { inputMap } } = this.props;

    if (!isCovariate && value === 'DELETE_VAR') {
      const inputCopy = { inputMap };
      delete inputCopy[objKey];
      return { ...inputCopy };
    } else if (!isCovariate) {
      return { ...inputMap, [objKey]: value };
    }

    const covars = [...inputMap.covariates];
    covars.splice(covarIndex, 1, { ...covars[covarIndex], [objKey]: value });
    return { ...inputMap, covariates: [...covars] };
  }

  getSelectList(array, value) { // eslint-disable-line class-methods-use-this
    if (array) {
      const index = array.indexOf(value);
      if (index > -1) {
        return [...array.splice(index, 1)];
      }
      return [...array, value];
    }

    return [value];
  }

  getSourceMenuItem(type, step) {
    // Make Camel Case
    let typeNoSpace = type.split(' ');
    typeNoSpace = typeNoSpace[0].toLowerCase() + typeNoSpace.slice(1).join('');

    return (
      <MenuItem
        eventKey={`covariate-${typeNoSpace}-inputs-menuitem`}
        key={`covariate-${typeNoSpace}-inputs-menuitem`}
        onClick={() => this.props.updateStep({
          ...step,
          inputMap: { type },
        })}
      >
        {type}
      </MenuItem>
    );
  }

  addCovariate() {
    const {
      pipelineIndex,
      step,
      updateStep,
    } = this.props;

    updateStep({
      ...step,
      inputMap: {
        ...step.inputMap,
        covariates:
        [
          ...step.inputMap.covariates,
          {
            type: '',
            source: {
              pipelineIndex: -1,
              inputKey: pipelineIndex === 0 ? 'file' : '',
              inputLabel: pipelineIndex === 0 ? 'File' : '',
            },
          },
        ],
      },
    });
  }

  render() {
    const {
      objKey,
      objParams,
      parentKey,
      possibleInputs,
      owner,
      step,
      updateStep,
    } = this.props;
    let sourceDropDownLabel = null;
    let isValue = false;
    let isFromCache;

    console.log(step.inputMap[objKey]);
    console.log('PI', possibleInputs);
    console.log('step', step);
    console.log('parentKey', parentKey);

    if (step.inputMap[objKey] && step.inputMap[objKey].fromCache) {
      sourceDropDownLabel = `Computation ${step.inputMap[objKey].fromCache.step + 1}: ${step.inputMap[objKey].fromCache.label}`;
    }

    if (step.inputMap[objKey] && step.inputMap[objKey].value) {
      isValue = true;
    }

    if (step.inputMap[objKey] && step.inputMap[objKey].fromCache) {
      isFromCache = true;
    }

    return (
      <div>
        {objKey === 'covariates' &&
          <div>
            <p className="bold">Variables</p>
            <Button
              disabled={!owner}
              bsStyle="primary"
              onClick={this.addCovariate}
              style={{ marginBottom: 10 }}
            >
              <span aria-hidden="true" className="glphicon glyphicon-plus" /> Add Variable
            </Button>
            <PipelineStepVariableTable
              getNewObj={this.getNewObj}
              getSourceMenuItem={this.getSourceMenuItem}
              objKey={objKey}
              objParams={objParams}
              owner={owner}
              parentKey={parentKey}
              possibleInputs={possibleInputs}
              step={step}
              updateStep={updateStep}
            />
          </div>
        }

        {objKey !== 'covariates' &&
          <Row style={{ paddingLeft: 10 }}>
            <Col xs={6}>
              <FormGroup controlId={`${parentKey}-form-group`}>
                {objParams.label &&
                  <ControlLabel>{objParams.label}</ControlLabel>
                }

                {objParams.description &&
                  <p>{objParams.description}</p>
                }

                {objParams.type === 'number' &&
                  <FormControl
                    disabled={!owner || isFromCache}
                    inputRef={(input) => { this[objKey] = input; }}
                    onChange={() => updateStep({
                      ...step,
                      inputMap: this.getNewObj(objKey,
                        this[objKey].value ? { value: parseFloat(this[objKey].value) } : 'DELETE_VAR'
                      ),
                    })}
                    type="number"
                    value={step.inputMap[objKey] ? step.inputMap[objKey].value : ''}
                  />
                }

                {objParams.type === 'array' && objParams.values &&
                  <FormControl
                    componentClass="select"
                    disabled={!owner}
                    inputRef={(input) => { this[objKey] = input; }}
                    multiple
                    onChange={() => updateStep({
                      ...step,
                      inputMap: this.getNewObj(
                        objKey,
                        this.getSelectList(step.inputMap[objKey].value, this[objKey].value)
                      ),
                    })}
                    value={step.inputMap[objKey] ? step.inputMap[objKey].value : []}
                  >
                    {objParams.values.map(val =>
                      <option key={`${val}-select-option`} value={val}>{val}</option>
                    )}
                  </FormControl>
                }

                {objParams.type === 'array' && !objParams.values && objParams.items === 'number' &&
                  step.inputMap[objKey] && step.inputMap[objKey].value.map((val, i) => (
                    <FormControl
                      key={`${objKey}-${i}`}
                      disabled={!owner}
                      inputRef={(input) => { this[i] = input; }}
                      onChange={() => updateStep({
                        ...step,
                        inputMap: {
                          [objKey]: {
                            value: update(step.inputMap[objKey].value, {
                              $splice: [[i, 1, parseFloat(this[i].value)]],
                            }),
                          },
                        },
                      })}
                      type="number"
                      value={step.inputMap[objKey][i] ? step.inputMap[objKey][i].value : ''}
                    />
                  ))
                }

                {objParams.type === 'boolean' &&
                  <Checkbox
                    disabled={!owner}
                    inputRef={(input) => { this[objKey] = input; }}
                    onChange={() => updateStep({
                      ...step,
                      inputMap: this.getNewObj(objKey, this[objKey].value),
                    })}
                    value={step.inputMap[objKey] ? step.inputMap[objKey].value : ''}
                  >
                    True?
                  </Checkbox>
                }
              </FormGroup>
            </Col>
            <Col xs={6} style={{ paddingTop: 25 }}>
              <DropdownButton
                id={`input-source-${objKey}-dropdown`}
                title={(!isValue && !isFromCache) ? 'Data Source' : (sourceDropDownLabel || 'Owner Defined Value')}
                disabled={!owner || !objParams.type || isValue}
              >
                {
                  <MenuItem
                    disabled={!owner}
                    eventKey={`clear-Computation-${objKey}-inputs-menuitem`}
                    key={`clear-Computation-${objKey}-inputs-menuitem`}
                    onClick={() => updateStep({
                      ...step,
                      inputMap: this.getNewObj(objKey, 'DELETE_VAR'),
                    })}
                  >
                    None
                  </MenuItem>
                }
                {this.getSourceMenuItem('File', step)}
                {possibleInputs.map(itemObj => (
                  // Iterate over possible computation inputs
                  Object.entries(itemObj.inputs)
                    // Filter out inputs that don't match type
                    .filter(filterIn => filterIn[1].type === objParams.type)
                    .map(itemInput => (
                      <MenuItem
                        disabled={!owner}
                        eventKey={`${itemInput[1].label}-Computation-${itemObj.possibleInputIndex + 1}-inputs-menuitem`}
                        key={`${itemInput[1].label}-Computation-${itemObj.possibleInputIndex + 1}-inputs-menuitem`}
                        onClick={() => updateStep({
                          ...step,
                          inputMap: this.getNewObj(objKey,
                            {
                              fromCache: {
                                step: itemObj.possibleInputIndex,
                                variable: itemInput[0],
                                label: itemInput[1].label,
                              },
                            }
                          ),
                        })}
                      >
                        {`Computation ${itemObj.possibleInputIndex + 1}: ${itemInput[1].label}`}
                      </MenuItem>
                    ))
                ))}
              </DropdownButton>
            </Col>
          </Row>
        }
      </div>
    );
  }
}

PipelineStepInput.defaultProps = {
  parentKey: '',
  owner: false,
  possibleInputs: [],
  updateStep: null,
};

PipelineStepInput.propTypes = {
  isCovariate: PropTypes.bool.isRequired,
  parentKey: PropTypes.string,
  pipelineIndex: PropTypes.number.isRequired,
  possibleInputs: PropTypes.array,
  objKey: PropTypes.string.isRequired,
  objParams: PropTypes.object.isRequired,
  owner: PropTypes.bool,
  step: PropTypes.object.isRequired,
  updateStep: PropTypes.func,
};

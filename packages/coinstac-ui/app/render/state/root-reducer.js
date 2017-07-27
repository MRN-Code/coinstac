import { combineReducers } from 'redux';
import { reducer as form } from 'redux-form';
import auth from './ducks/auth';
import computations from './ducks/computations';
import consortia from './ducks/consortia';
import loading from './ducks/loading';
import projects from './ducks/projects';
import results from './ducks/results';

const rootReducer = combineReducers({
  auth,
  computations,
  consortia,
  form,
  loading,
  projects,
  results,
});

export default rootReducer;

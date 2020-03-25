import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import app from './ducks/app';
import auth from './ducks/auth';
import docker from './ducks/docker';
import loading from './ducks/loading';
import maps from './ducks/maps';
import runs from './ducks/runs';
import notifications from './ducks/notifyAndLog';

const CLEAR_STATE = 'CLEAR_STATE';
const REHYDRATE = 'REHYDRATE';

export const clearState = () => ({ type: CLEAR_STATE });
export const rehydrate = state => ({ type: REHYDRATE, payload: state });

function rootReducer(client) {
  const appReducer = combineReducers({
    apollo: client.reducer(),
    app,
    auth,
    docker,
    loading,
    notifications,
    runs,
    maps,
    routing: routerReducer,
  });

  return (state, action) => {
    if (action.type === CLEAR_STATE) {
      state = undefined;
    }

    if (action.type === REHYDRATE) {
      state = {
        ...state,
        ...action.payload,
      };
    }

    return appReducer(state, action);
  };
}

export default rootReducer;

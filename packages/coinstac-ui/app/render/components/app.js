import Notify from './notification';
import React, { PropTypes } from 'react';
import { connect } from 'react-redux';

function App(props) {
  const isLoading = props.loading.isLoading;
  return (
    <div className="app">
      <ul id="spinner" className={isLoading ? 'is-loading' : ''}>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>

      {props.children}

      <ul id="loading_list">
        {Object.keys(props.loading.wip).map((loadingKey, ndx) => {
          return (<li key={ndx}>{loadingKey}</li>);
        })}
      </ul>

      <Notify />
    </div>
  );
}

App.displayName = 'App';

App.propTypes = {
  children: PropTypes.node,
  loading: PropTypes.object,
};

function select(state) {
  return {
    loading: state.loading,
  };
}

export default connect(select)(App);

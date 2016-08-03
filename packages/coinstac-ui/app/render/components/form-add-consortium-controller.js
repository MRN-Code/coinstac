import React, { Component, PropTypes } from 'react';
import FormAddConsortium from './form-add-consortium';
import { saveConsortium } from '../state/ducks/consortium';
import { connect } from 'react-redux';

class FormAddConsortiumController extends Component {
  constructor(props) {
    super(props);

    this.handleClickCancel = this.handleClickCancel.bind(this);
    this.submit = this.submit.bind(this);
  }

  handleClickCancel() {
    this.context.router.push('/consortia');
  }

  submit(consortium) {
    const { dispatch } = this.props;
    const { router } = this.context;
    const tium = Object.assign({}, consortium, {
      owners: [this.props.auth.user.username],
      users: [this.props.auth.user.username],
    });
    dispatch(saveConsortium(tium))
    .then((newTium) => {
      router.push(`/consortia/${newTium._id}`);
    });
  }

  render() {
    const { loading } = this.props;

    return (
      <div>
        <div className="page-header clearfix">
          <h1 className="pull-left">Add New Consortium</h1>
        </div>
        <FormAddConsortium
          loading={!!loading.isLoading}
          handleCancel={this.handleClickCancel}
          handleSubmit={this.submit}
        />
      </div>
    );
  }
}

FormAddConsortiumController.contextTypes = {
  router: PropTypes.object.isRequired,
};

FormAddConsortiumController.propTypes = {
  auth: PropTypes.object.isRequired,
  loading: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  const { auth, loading } = state;
  return { auth, loading };
};

export default connect(mapStateToProps)(FormAddConsortiumController);

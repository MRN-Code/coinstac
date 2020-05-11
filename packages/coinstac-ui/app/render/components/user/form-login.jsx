import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import classNames from 'classnames';
import FormStartupDirectory from './form-startup-directory';
import { EXPIRED_TOKEN } from '../../utils/error-codes';

const styles = theme => ({
  loginFormContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  paper: {
    padding: theme.spacing.unit * 2,
    maxWidth: 300,
    marginBottom: theme.spacing.unit * 2,
  },
  bottomMargin: {
    marginBottom: 10,
  },
  formControl: {
    marginBottom: theme.spacing.unit * 2,
  },
  error: {
    textAlign: 'center',
    color: 'red',
  },
});

class FormLogin extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
      saveLogin: false,
      openSetStartupDirectoryDialog: false,
    };
  }

  onSubmit = (e) => {
    e.preventDefault();

    const { submit } = this.props;
    const { username, password, saveLogin } = this.state;

    const data = {
      username: username.trim(),
      password: password.trim(),
      saveLogin,
    };

    submit(data);
  }

  handleChange = name => (event) => {
    this.setState({
      [name]: event.target.value,
    });
  };

  handleChangeCheckbox = name => (event) => {
    this.setState({
      [name]: event.target.checked,
    });
  };

  openStartupDirectoryDialog = () => {
    this.setState({ openSetStartupDirectoryDialog: true });
  }

  closeStartupDirectoryDialog = () => {
    this.setState({ openSetStartupDirectoryDialog: false });
  }

  changeAppDirectory = ({ appDirectory }) => {
    const { changeAppDirectory } = this.props;
    changeAppDirectory(appDirectory);
    this.setState({ openSetStartupDirectoryDialog: false });
  }

  renderError = () => {
    const { auth, classes } = this.props;

    const errorMessage = auth.error === EXPIRED_TOKEN
      ? 'Your login session has expired,<br/>please re-login'
      : auth.error;

    return (
      <p className={classNames(classes.bottomMargin, classes.error)}>
        {errorMessage}
      </p>
    );
  }

  render() {
    const { auth, loading, classes } = this.props;
    const {
      username, password, saveLogin, openSetStartupDirectoryDialog,
    } = this.state;

    return (
      <div className={classes.loginFormContainer}>
        <Paper className={classes.paper}>
          <form onSubmit={this.onSubmit}>
            { auth.error && this.renderError() }
            {
              !auth.isApiVersionCompatible
              && (
                <p className={classNames(classes.bottomMargin, classes.error)}>
                  This Coinstac version is not compatible with the API.
                </p>
              )
            }
            <TextField
              id="login-username"
              label="Username"
              value={username}
              onChange={this.handleChange('username')}
              fullWidth
              className={classes.formControl}
            />
            <TextField
              id="login-password"
              label="Password"
              value={password}
              onChange={this.handleChange('password')}
              type="password"
              fullWidth
              className={classes.formControl}
            />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={saveLogin}
                  onChange={this.handleChangeCheckbox('saveLogin')}
                />
)}
              label="Keep me logged in"
              className={classes.formControl}
            />
            <Button
              variant="contained"
              color="secondary"
              type="submit"
              fullWidth
              disabled={loading.isLoading || !auth.isApiVersionCompatible}
            >
              Log In
            </Button>
          </form>
        </Paper>
        <Button disabled={!auth.isApiVersionCompatible}>Forgot Password?</Button>
        <Button
          disabled={!auth.isApiVersionCompatible}
          onClick={this.openStartupDirectoryDialog}
        >
          Change App Settings
        </Button>
        <FormStartupDirectory
          open={openSetStartupDirectoryDialog}
          close={this.closeStartupDirectoryDialog}
          onSubmit={this.changeAppDirectory}
          appDirectory={auth.appDirectory}
        />
      </div>
    );
  }
}

FormLogin.propTypes = {
  auth: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  loading: PropTypes.object,
  changeAppDirectory: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

FormLogin.defaultProps = {
  loading: null,
};

export default withStyles(styles)(FormLogin);

import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { withStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import PropTypes from 'prop-types';
import update from 'immutability-helper';
import Select from '../common/react-select';
import memoize from 'memoize-one';
import MemberAvatar from '../common/member-avatar';

const styles = theme => ({
  tabTitleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.unit * 2,
  },
  textField: {
    marginTop: theme.spacing.unit * 2,
  },
  membersContainer: {
    marginTop: theme.spacing.unit * 4,
  },
  addMemberContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
  addMemberButton: {
    marginLeft: theme.spacing.unit * 2,
  },
});

class ConsortiumAbout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      consortiumUsers: [],
      newMember: null,
    };

    this.addMember = this.addMember.bind(this);
    this.toggleOwner = this.toggleOwner.bind(this);
    this.handleMemberSelect = this.handleMemberSelect.bind(this);
  }

  static getDerivedStateFromProps(props) {
    if (props.consortiumUsers) {
      return {
        consortiumUsers: props.consortiumUsers.sort((a, b) => a.id.localeCompare(b.id)),
      };
    }
    return null;
  }

  addMember() {
    const newMember = this.state.newMember;
    this.props.addMemberToConsortium(newMember.value);
  }

  toggleOwner(consUser) {
    const { addUserRole, consortium, owner, removeUserRole, user } = this.props;
    return () => {
      if (owner && consUser.id !== user.id) {
        if (consUser.owner) {
          removeUserRole(consUser.id, 'consortia', consortium.id, 'owner');
          addUserRole(consUser.id, 'consortia', consortium.id, 'member');
        } else {
          addUserRole(consUser.id, 'consortia', consortium.id, 'owner');
          removeUserRole(consUser.id, 'consortia', consortium.id, 'member');
        }
      }
    };
  }

  handleMemberSelect(value) {
    this.setState({ newMember: value });
  }

  handleTextFieldChange = name => event => {
    const { updateConsortium } = this.props;
    updateConsortium({ param: name, value: event.target.value });
  }

  mapUsers = memoize(
    users => users ? users.map(user => ({ label: user.id, value: user.id })) : null
  );

  filterSelectedUsers = memoize(
    (allUsers, selectedUsers) => {
      if (!allUsers && selectedUsers) {
        return null;
      }

      return allUsers.filter(user => selectedUsers.findIndex(selectedUser => selectedUser.id === user.value) === -1);
    }
  );

  render() {
    const {
      consortium,
      owner,
      removeMemberFromConsortium,
      saveConsortium,
      user,
      users,
      classes,
    } = this.props;

    const { consortiumUsers } = this.state;

    const allUsers = this.mapUsers(users);
    const userOptions = this.filterSelectedUsers(allUsers, consortiumUsers);

    return (
      <form onSubmit={saveConsortium}>
        <div className={classes.tabTitleContainer}>
          <Typography variant="h5">
            About Consortium
          </Typography>
          {
            owner
            && (
              <Button
                variant="contained"
                color="primary"
                type="submit"
              >
                Save
              </Button>
            )
          }
        </div>
        <TextField
          id="name"
          label="Name"
          fullWidth
          required
          disabled={!owner}
          value={consortium.name}
          onChange={this.handleTextFieldChange('name')}
          className={classes.textField}
        />
        <TextField
          id="description"
          label="Description"
          fullWidth
          disabled={!owner}
          value={consortium.description}
          onChange={this.handleTextFieldChange('description')}
          className={classes.textField}
        />
        {
          consortium.id &&
          <div key="avatar-container" className={classes.membersContainer}>
            <Typography variant="subtitle2">Owner(s)/Members:</Typography>
            {
              owner &&
              <div className={classes.addMemberContainer}>
                <Select
                  placeholder="Select an user"
                  options={userOptions}
                  onChange={this.handleMemberSelect}
                  removeSelected
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={this.addMember}
                  className={classes.addMemberButton}
                >
                  Add Member
                </Button>
              </div>
            }
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Member</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  consortiumUsers.map(consUser =>
                    (
                      <TableRow key={`${consUser.id}-row`}>
                        <TableCell>
                          <MemberAvatar
                            isOwner={owner}
                            consRole="Member"
                            name={consUser.id}
                            width={30}
                          />
                          <span>{consUser.id}</span>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            onChange={this.toggleOwner(consUser)}
                            checked={consUser.owner ? true : false}
                            disabled={!owner || consUser.id === user.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox disabled checked={consUser.member} />
                        </TableCell>
                        {
                          owner
                          && (
                            <TableCell>
                              {
                                user.id !== consUser.id
                                && (
                                  <Button
                                    variant="contained"
                                    color="default"
                                    onClick={removeMemberFromConsortium(consUser)}
                                  >
                                    Remove
                                    <DeleteIcon />
                                  </Button>
                                )
                              }
                            </TableCell>
                          )
                        }
                      </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        }
      </form>
    );
  }
}

ConsortiumAbout.propTypes = {
  consortium: PropTypes.object,
  owner: PropTypes.bool.isRequired,
  removeMemberFromConsortium: PropTypes.func.isRequired,
  saveConsortium: PropTypes.func.isRequired,
  updateConsortium: PropTypes.func.isRequired,
};

ConsortiumAbout.defaultProps = {
  consortium: null,
};

export default withStyles(styles)(ConsortiumAbout);

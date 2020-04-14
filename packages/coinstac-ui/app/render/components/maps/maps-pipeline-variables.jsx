import React from 'react';
import PropTypes from 'prop-types';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import MapsStepFieldset from './maps-step-fieldset';

const styles = theme => ({
  rootPaper: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    marginTop: theme.spacing.unit * 2,
    height: '100%',
  },
});

function MapsPipelineVariables(props) {
  const {
    consortium,
    registerDraggableContainer,
    stepsDataMappings,
    unmapField,
    classes,
  } = props;

  return (
    <Grid item sm={4}>
      <Paper
        className={classes.rootPaper}
        elevation={1}
      >
        <Typography variant="headline" className={classes.title}>
          { `${consortium.name}: Pipeline` }
        </Typography>
        <Divider />
        {
          consortium.pipelineSteps && consortium.pipelineSteps.map((step) => {
            const { inputMap } = step;

            return Object.keys(inputMap).map((inputMapKey) => {
              if (inputMapKey === 'meta') {
                return;
              }

              return (
                <MapsStepFieldset
                  registerDraggableContainer={registerDraggableContainer}
                  key={`step-${inputMapKey}`}
                  fieldsetName={inputMapKey}
                  stepFieldset={inputMap[inputMapKey]}
                  stepsDataMappings={stepsDataMappings}
                  consortium={consortium}
                  unmapField={unmapField}
                />
              );
            });
          })
        }
      </Paper>
    </Grid>
  );
}

MapsPipelineVariables.propTypes = {
  classes: PropTypes.object.isRequired,
  consortium: PropTypes.object.isRequired,
  stepsDataMappings: PropTypes.array.isRequired,
  registerDraggableContainer: PropTypes.func.isRequired,
  unmapField: PropTypes.func.isRequired,
};

export default withStyles(styles)(MapsPipelineVariables);

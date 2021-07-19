import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import FilePicker from '../common/file-picker';

const styles = theme => ({
  rootPaper: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
  },
  header: {
    textTransform: 'capitalize',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successIcon: {
    width: 40,
    height: 40,
    color: '#43a047',
  },
});

function MapsFilesField({
  fieldName, fieldDataMap, fieldDescription, onChange, classes,
}) {
  function setSelectedFiles(selectedFiles) {
    onChange(fieldName, { files: selectedFiles });
  }

  function appendSelectedFiles(selectedFiles) {
    let files;
    if (fieldDataMap && fieldDataMap.files && fieldDataMap.files.length > 0) {
      files = fieldDataMap.files.concat(selectedFiles);
    } else {
      files = selectedFiles;
    }

    setSelectedFiles(files);
  }

  function deleteFile(fileIndex) {
    const newFiles = fieldDataMap.files.filter((f, i) => i !== fileIndex);
    setSelectedFiles(newFiles);
  }

  return (
    <Paper className={classes.rootPaper} elevation={2}>
      <Typography variant="h4" className={classes.header}>
        {fieldName}
        {Boolean(fieldDataMap) && <CheckCircleIcon className={classes.successIcon} />}
      </Typography>
      <FilePicker
        multiple
        filterName="csv,txt,gz,nii files"
        extensions={fieldDescription.extensions}
        onChange={files => appendSelectedFiles(files)}
        selectedFiles={fieldDataMap && fieldDataMap.files ? fieldDataMap.files : []}
        deleteFile={fileIndex => deleteFile(fileIndex)}
      />
    </Paper>
  );
}

MapsFilesField.propTypes = {
  classes: PropTypes.object.isRequired,
  fieldName: PropTypes.string.isRequired,
  fieldDataMap: PropTypes.object,
  fieldDescription: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

MapsFilesField.defaultProps = {
  fieldDataMap: null,
};

export default withStyles(styles)(MapsFilesField);

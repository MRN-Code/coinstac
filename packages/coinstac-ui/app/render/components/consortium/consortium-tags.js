import React from 'react';
import PropTypes from 'prop-types';

export default function ConsortiumTags(props) {
  const { tags } = props;

  return (
    <ul className="list-inline">
      {tags.map((tag, index) => {
        return (
          <li key={index}>
            <span className="label label-default">{tag}</span>
          </li>
        );
      })}
    </ul>
  );
}

ConsortiumTags.displayName = 'ConsortiumTags';

ConsortiumTags.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
};


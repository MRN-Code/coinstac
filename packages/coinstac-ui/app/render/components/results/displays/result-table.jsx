import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Button } from 'react-bootstrap';

const styles = {
  csvButton: { position: 'absolute', top: '20rem', right: '2rem' },
  theading: { color: 'white', fontSize: '0' },
};

/**
 * downloadCSV
 * Create a named empty CSV file inject string blob and download
 * @param {string} csv Table values
 * @param {string} filename The name of the file
 */
function downloadCSV(csv, filename) {
  const csvFile = new Blob([csv], { type: 'text/csv' });
  const downloadLink = document.createElement('a');
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

/**
 * exportTableToCSV
 * Convert HTML Table to CSV formatted string
 * @param {string} html Table hypertext
 * @param {string} filename The name of the file
 */
function exportTableToCSV(html, filename) {
  const csv = [];
  const rows = document.querySelectorAll('table tr');

  for (let i = 0; i < rows.length; i += 1) {
    const row = [];
    let cols = rows[i].querySelectorAll('th');
    if (cols.length === 0) {
      cols = rows[i].querySelectorAll('td');
    }
    for (let j = 0; j < cols.length; j += 1) {
      row.push(cols[j].innerText);
      if (j === cols.length - 1) {
        csv.push(row.join(','));
      }
    }
  }
  // Download CSV
  downloadCSV(csv.join('\n'), filename);
}

function parseTableColumnOutput(output) {
  if (Array.isArray(output)) {
    const cols = [];
    // eslint-disable-next-line
    output.map((o) => {
      o = parseFloat(o).toFixed(4);
      if (parseFloat(o) === 0) {
        o = 0;
      } else if (Math.abs(o) > 999 || Math.abs(o) < 0.001) {
        o = parseFloat(o).toExponential(4);
      }
      cols.push(<td key={`value-${o}`}>{o}&nbsp;</td>);
    });
    return cols;
  } else if (!isNaN(output) && typeof output !== 'boolean') {
    if (output === 0) {
      output = 0;
    } else if (Math.abs(output) > 999 || Math.abs(output) < 0.001) {
      return parseFloat(output).toExponential(4);
    }
    return output;
  }

  return output;
}

class TableResult extends Component {

  /**
   * slugify
   * Converts human readable string to a slug
   * @param  {string} text Input String to Convert
   * @return {string}     Converted String to Slug
   */

   // ignore weird class-methods-use-this lint error
   // eslint-disable-next-line
  slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  /**
   * saveFileCSV
   * OnClick function to convert Table HTML to csv, save, and download file
   * @param {string} filename The name of the file
   */
  saveFileCSV = () => {
    const { title } = this.props;
    const html = document.querySelector('table').outerHTML;
    const filename = this.slugify(title);
    exportTableToCSV(html, `${filename}.csv`);
  }

  makeTable(table, data, outputProps, heading, marginLeft) {
    const tableContents = [];
    if (heading) {
      tableContents.push(
        <h3 style={{ marginLeft }} key={heading}>{heading}</h3>
      );
    }

    if ((table && table.subtables && Array.isArray(data))) {
      data.forEach((d) => {
        tableContents.push(
          this.makeTable(table, d, outputProps, null, marginLeft + 10)
        );
        tableContents.push(<hr style={{ borderTop: '1px solid black' }} />);
      });
    } else if (table && table.subtables && typeof table.subtables === 'object') {
      table.subtables.forEach((t) => {
        let heading = outputProps.items[t.source].label;

        if (t.subtitle) {
          heading += ` -- ${data[t.subtitle]}`;
        }

        tableContents.push(
          this.makeTable(
            t,
            data[t.source],
            outputProps.items[t.source],
            heading,
            marginLeft + 10
          )
        );
      });
    } else if (table && table.subtables && table.subtables === 'by-key') {
      Object.entries(data).forEach((keyValPair) => {
        tableContents.push(
          this.makeTable(
            null,
            keyValPair[1],
            outputProps,
            keyValPair[0],
            marginLeft + 10
          )
        );
      });
    } else if (!table || (table && !table.subtables)) {
      const keyValPairs = Object.entries(data);
      let keys = [];

      if (Array.isArray(data)) {
        keys = Object.entries(data[0]);
      }

      let labels = [];

      if (heading.includes('Global') && Array.isArray(data.covariate_labels[0])) {
        labels = data.covariate_labels[0];
      } else {
        labels = data.covariate_labels;
      }

      if (heading.includes('Global')) {
        // do nothing
      } else {
        heading = `Local - ${heading}`;
      }

      tableContents.push(
        <div>
        {data.covariate_labels && data.covariate_labels.length > 0 &&
        <Table
          responsive
          bordered
          key={`${heading}-table-objects`}
          style={{ marginLeft, width: '60%' }}
        >
        <thead>
            <tr>
              <th key={`${heading}-table-heading`} style={styles.theading}>{heading}</th>
              {labels.map((label, index) => {
                  return <th key={`${index}-table-label`} className={'text-nowrap'}>&beta;{`${index} (${label})`}</th>
              })}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) &&
              data.map((d, index) => {
                return (
                  <tr key={`${heading}-${index}-${key[0]}-objects-row`}>
                    {keys.map(key =>
                    (
                      <td style={{ fontFamily: 'Courier' }} key={`${heading}-${index}-${key[0]}-column`}>
                        {parseTableColumnOutput(d[key[0]])}
                      </td>
                    ))}
                  </tr>
                );
              })
            }
            {!Array.isArray(data) &&
              keyValPairs.map((pair) => {
                  if(typeof pair[1] === 'object' && pair[0] !== 'covariate_labels') {
                    return <tr key={`${heading}-${pair[0]}-objects-row`}>
                      <td className="bold"  key={`${heading}-${pair[0]}-}-column`}>
                        {outputProps.items[pair[0]] ? outputProps.items[pair[0]].label : pair[0]}
                      </td>
                      {parseTableColumnOutput(pair[1])}
                    </tr>;
                  }
                }
              )
            }
          </tbody>
        </Table>
        }
        <Table
          responsive
          bordered
          condensed
          key={`${heading}-table-numbers`}
          style={{ marginLeft, width: '60%' }}
        >
          {Array.isArray(data) &&
            <thead>
              <tr>
                {keys.map(key => <th key={`${key[0]}-numbers-heading`}>{key[0]}</th>)}
              </tr>
            </thead>
          }
          <tbody>
            {Array.isArray(data) &&
              data.map((d, index) => {
                return (
                  <tr key={`${index}-objects-row`}>
                    {keys.map(key =>
                    (
                      <td style={{ fontFamily: 'Courier' }} key={`${key[0]}-column`}>
                        {parseTableColumnOutput(d[key[0]])}
                      </td>
                    ))}
                  </tr>
                );
              })
            }
            {!Array.isArray(data) &&
              keyValPairs.map((pair) => {
                  if(typeof pair[1] === 'number') {
                    return <tr key={`${pair[0]}-numbers-row`}>
                      <td className="bold" key={`${pair[0]}-numbers-column`}>
                      {outputProps.items[pair[0]] ? outputProps.items[pair[0]].label : pair[0]}
                      </td>
                      <td style={{ fontFamily: 'Courier' }} key={`${pair[0]}-numbers-column-output`}>
                        {parseTableColumnOutput(pair[1])}
                      </td>
                    </tr>;
                  }
                }
              )
            }
          </tbody>
        </Table>
        </div>
      );
    }

    return tableContents;
  }

  render() {
    const { computationOutput, plotData, tables } = this.props;

    return (
      <div>
        <Button
          bsStyle="primary"
          onClick={this.saveFileCSV}
          style={styles.csvButton}
        >
          Download to CSV
        </Button>
        {tables && tables.map(t =>
          this.makeTable(
            t,
            plotData[t.source],
            computationOutput[t.source],
            computationOutput[t.source].label,
            0
          )
        )}
        {!tables && this.makeTable(null, plotData.testData, null, 'Test Data', 0)}
      </div>
    );
  }
}

TableResult.propTypes = {
  computationOutput: PropTypes.object,
  plotData: PropTypes.object.isRequired,
  tables: PropTypes.array,
};

TableResult.defaultProps = {
  computationOutput: null,
  tables: null,
};

export default TableResult;

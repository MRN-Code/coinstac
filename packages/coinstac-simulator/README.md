# coinstac-simulator

<img src="https://raw.githubusercontent.com/MRN-Code/coinstac/master/img/coinstac.png" height="75px">

COINSTAC simulator for computation runs. [Documentation](http://mrn-code.github.io/coinstac/).

<img src="https://raw.githubusercontent.com/MRN-Code/coinstac/master/packages/coinstac-simulator/media/demo-capture.gif" />

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed. Then, the following command from a shell:

```shell
npm install --global coinstac-simulator
```

## Use

_coinstac-simulator_ contains a command line interface and a Node.js API. The simulator is designed to be run in your root computation directory,
but can be run by specifying exact paths to necessary files.

### CLI

_coinstac-simulator_ has no required flags, but will assume `./compspec.json`, `./test/inputspec.json`, and `./test/[input|cache|output]` for computation use. The later directories will be created automatically if they do not exist. File outputs are saved to `./test/[local#|remote]/output/simulatorRun`, consecutive runs _will_ overwrite data. If you do not have an input spec for you run, a prompt will ask you for inputs based on the current compspec and give you the option to persist that input spec.

An example computation specification, `compspec.json`, can be found [here](https://github.com/MRN-Code/coinstac/blob/master/packages/coinstac-simulator/test/test-comps/coinstac-local-test/compspec.json) and [here](https://github.com/MRN-Code/coinstac/blob/master/packages/coinstac-simulator/test/test-comps/coinstac-decentralized-test/compspec.json) for decentralized computations.

Run `coinstac-simulator --help` for more information on how to use the CLI.

## License

MIT. See [LICENSE](./LICENSE) for details.

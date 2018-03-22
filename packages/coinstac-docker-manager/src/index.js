const Docker = require('dockerode');
const request = require('request-promise-native');
const portscanner = require('portscanner');

const setTimeoutPromise = (delay) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};

// TODO: ENV specific socket
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const streamPool = {};
const jobPool = {};
let services = {};

const generateServicePort = (serviceId) => {
  return portscanner.findAPortNotInUse(8100, 49151, '127.0.0.1')
  .then((newPort) => {
    services[serviceId].port = newPort;
    return newPort;
  });
};

const manageStream = (stream, jobId) => {
  streamPool[jobId] = { stream, data: '', error: '' };

  let header = null;
  stream.on('readable', () => {
    // Demux streams, docker puts stdout/err together
    header = header || stream.read(8);
    while (header !== null) {
      const type = header.readUInt8(0);
      const payload = stream.read(header.readUInt32BE(4));
      if (payload === null) break;
      if (type === 2) {
        streamPool[jobId].error += payload;
      } else {
        streamPool[jobId].data += payload;
      }
      header = stream.read(8);
    }
  });

  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      const container = jobPool[jobId];
      if (streamPool[jobId].error) {
        container.remove()
        .then(() => {
          jobPool[jobId] = undefined;
        });
        reject(streamPool[jobId].error);
        streamPool[jobId] = undefined;
      } else {
        resolve(streamPool[jobId].data);
        streamPool[jobId] = undefined;

        container.remove()
        .then(() => {
          jobPool[jobId] = undefined;
        });
      }
    });
    stream.on('error', (err) => {
      const container = jobPool[jobId];

      streamPool[jobId] = undefined;

      container.stop()
      .then(() => container.remove())
      .then(() => {
        jobPool[jobId] = undefined;
      });
      reject(err);
    });
  });
};

const queueJob = (jobId, input, opts) => {
  const jobOpts = Object.assign(
    {
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Cmd: input,
    },
    opts
  );
  return docker.createContainer(jobOpts).then((container) => {
    jobPool[jobId] = container;

    // Return a Promise that resolves when the container's data stream 2closes,
    // which should happen when the comp is done.
    const dataFinished = new Promise((resolve, reject) => {
      container.attach({ stream: true, stdout: true, stderr: true }, (err, stream) => {
        if (!err) {
          resolve(manageStream(stream, jobId));
        }

        reject(err);
      });
    });

    return container.start()
    .then(() => dataFinished);
  });
};

/**
 * Retrieve list of all local Docker images
 * @return {Object[]} Array of objects containing locally stored Docker images
 */
const getAllImages = () => {
  return docker.listImages();
};

/**
 * Pull individual image from Docker hub
 * @param {String} computation Docker image name
 * @return {Object} Returns stream of docker pull output
 */
const startService = (serviceId, serviceUserId, opts) => {
  let recurseLimit = 0;
  const createService = () => {
    let proxRes;
    let proxRej;
    services[serviceId] = { users: [serviceUserId] };
    services[serviceId].state = 'starting';
    services[serviceId].service = new Promise((res, rej) => {
      proxRes = res;
      proxRej = rej;
    });
    const tryStartService = () => {
      return generateServicePort(serviceId)
      .then((port) => {
        const defaultOpts = {
          ExposedPorts: { '8881/tcp': {} },
          HostConfig: {
            PortBindings: { '8881/tcp': [{ HostPort: `${port}`, HostIp: '127.0.0.1' }] },
          },
          Tty: true,
        };

        // merge opts one level deep
        const memo = {};
        for (let [key] of Object.entries(defaultOpts)) { // eslint-disable-line no-restricted-syntax, max-len, prefer-const
          memo[key] = Object.assign(defaultOpts[key], opts[key] ? opts[key] : {});
        }

        const jobOpts = Object.assign(
          {},
          opts,
          memo
        );
        return docker.createContainer(jobOpts);
      })
      .then((container) => {
        services[serviceId].container = container;
        return container.start();
      })
      // timeout for server startup
      .then(() => setTimeoutPromise(5000))
      .then(() => {
        services[serviceId].service = (data) => {
          return request({
            url: `http://127.0.0.1:${services[serviceId].port}/run`,
            method: 'POST',
            json: true,
            body: { command: data },
          });
        };
        services[serviceId].state = 'running';
        // fulfill to waiting consumers
        proxRes(services[serviceId].service);
        return services[serviceId].service;
      })
      .catch((err) => {
        if (err.statusCode === 500 && err.message.includes('port is already allocated') && recurseLimit < 500) {
          recurseLimit += 1;
          // this problem mostly occurs when started several boxes quickly
          // add some delay to give them breathing room to setup ports
          return setTimeoutPromise(Math.floor(Math.random() * Math.floor(200)))
          .then(() => tryStartService());
        }
        proxRej(err);
        throw err;
      });
    };
    return tryStartService();
  };

  if (services[serviceId]) {
    if (services[serviceId].users.indexOf(serviceUserId) === -1) {
      services[serviceId].users.push(serviceUserId);
    }
    return Promise.resolve(services[serviceId].service);
  }

  return createService();
};

/**
 * Pull individual image from Docker hub
 * @param {String} computation Docker image name
 * @return {Object} Returns stream of docker pull output
 */
const pullImage = (computation) => {
  return new Promise((resolve, reject) => {
    docker.pull(computation, (err, stream) => {
      if (err) {
        reject(err);
      }
      resolve(stream);
    });
  });
};

/**
 * Remove the Docker image associated with the image id
 * @param {string} imgId ID of image to remove
 * @return {Promise}
 */
const removeImage = (imageId) => {
  return docker.getImage(imageId).remove();
};

/**
 * Attempts to stop a given service
 * If there are no other users, the service stops
 * Otherwise the user is removed from service usage
 *
 * @param  {String} serviceId     the service to stop
 * @param  {String} serviceUserId the user asking
 * @return {Promise}              A promise that resovles on success
 */
const stopService = (serviceId, serviceUserId) => {
  if (services[serviceId].users.indexOf(serviceUserId) > -1) {
    services[serviceId].users.splice(services[serviceId].users.indexOf(serviceUserId), 1);
  }
  if (services[serviceId].users.length === 0) {
    return services[serviceId].container.stop()
    .then(() => {
      delete services[serviceId];
    }).catch((err) => {
      // TODO: boxes don't always shutdown well, however that shouldn't crash a valid run
      // figure out a way to cleanup
      services[serviceId].state = 'zombie';
      services[serviceId].error = err;
    });
  }
  return Promise.resolve();
};

/**
 * Stops all currently running containers
 * @return {Promise} resolved when all services are stopped
 */
const stopAllServices = () => {
  return Promise.all(
    Object.keys(services)
    .map(service => services[service].container.stop()))
    .then(() => {
      services = {};
    }
  );
};

module.exports = {
  getAllImages,
  pullImage,
  removeImage,
  queueJob,
  startService,
  stopService,
  stopAllServices,
  Docker,
};

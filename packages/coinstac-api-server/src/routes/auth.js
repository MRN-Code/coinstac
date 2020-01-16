const helperFunctions = require('../auth-helpers');

module.exports = [
  {
    method: 'POST',
    path: '/authenticate',
    config: {
      auth: false,
      pre: [
        { method: helperFunctions.validateUser, assign: 'user' },
      ],
      handler: (req, res) => {
        res({
          id_token: helperFunctions.createToken(req.pre.user.id),
          user: req.pre.user,
        }).code(201);
      },
    },
  },
  {
    method: 'POST',
    path: '/authenticateByToken',
    config: {
      auth: 'jwt',
      handler: ({
        auth: {
          credentials: {
            email, id, institution, permissions,
          },
        },
      }, res) => {
        res({
          id_token: helperFunctions.createToken(id),
          user: {
            email, id, institution, permissions,
          },
        }).code(201);
      },
    },
  },
  {
    method: 'POST',
    path: '/createAccount',
    config: {
      auth: false,
      pre: [
        { method: helperFunctions.validateUniqueUser },
      ],
      handler: (req, res) => {
        helperFunctions.hashPassword(req.payload.password)
          .then(passwordHash => helperFunctions.createUser(req.payload, passwordHash))
          .then(({
            id, institution, email, permissions,
          }) => {
            res({
              id_token: helperFunctions.createToken(id),
              user: {
                id, institution, email, permissions,
              },
            }).code(201);
          });
      },
    },
  },
  {
    method: 'POST',
    path: '/sendPasswordResetEmail',
    config: {
      auth: false,
      pre: [
        { method: helperFunctions.validateEmail },
      ],
      handler: (req, res) => {
        const resetToken = helperFunctions.createPasswordResetToken(req.payload.email)
          
        helperFunctions
          .savePasswordResetToken(req.payload.email, resetToken)
          .then(() => {
            res().code(204);
          })
      },
    },
  },
  {
    method: 'POST',
    path: '/resetPassword',
    config: {
      auth: false,
      pre: [
        { method: helperFunctions.validateResetToken },
      ],
      handler: (req, res) => {
        helperFunctions
          .resetPassword(req, res)
          .then(() => {
            res().code(204);
          })
      },
    },
  },
];

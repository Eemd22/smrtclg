const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

module.exports = (io) => {

  router.get('/posts', postController.getPosts);

  router.post('/posts', (req, res) =>
    postController.addPost(req, res, io)
  );

  router.delete('/posts/:id', (req, res) =>
    postController.deletePost(req, res, io)
  );

  router.put('/posts/:id', (req, res) =>
    postController.updatePost(req, res, io)
  );

  return router;
};

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post('/signup', authController.signup); //when signing up you should only post data.
router.post('/login', authController.login); //when signing up you should only post data.

router.post('/forgotPassword', authController.forgotPassword); //when signing up you should only post data.
router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
); //patch is used when changing stuff in the document
router.patch('/resetPassword/:token', authController.resetPassword); //when signing up you should only post data.

router.patch('/updateMe', authController.protect, userController.updateMe);
router.delete('/deleteMe', authController.protect, userController.deleteMe);

router.route('/').get(userController.getUsers).post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

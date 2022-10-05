const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

// router.param('id', tourController.checkId);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getTours);

router.route('/tourstats').get(tourController.getTourStats);
router
  .route('/')
  .get(authController.protect, tourController.getTours)
  .post(tourController.createTour);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    tourController.deleteTour
  );

module.exports = router;

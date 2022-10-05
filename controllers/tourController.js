const express = require('express');
const AppError = require('../utils/appError');
const { findByIdAndUpdate } = require('./../Models/tourModel');
const TourModel = require('./../Models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
// const tours = JSON.parse(fs.readFileSync('./tours-simple.json'));
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTours = catchAsync(async (req, res, next) => {
  // console.log(req.query);
  const features = new APIFeatures(TourModel.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  //SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const Tour = await TourModel.findById(req.params.id);
  if (!Tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({ status: 'success', data: { Tour } });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await TourModel.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { tour: newTour },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await TourModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const Tour = await TourModel.findByIdAndDelete(req.params.id);
  if (!Tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: { tour: null },
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await TourModel.aggregate([
    { $match: { ratingsAverage: { $gte: 4.5 } } }, //tours with rating greater than 4.5
    {
      $group: {
        //we want to calculate the averagerating
        _id: '$difficulty', //this gets the statistics for each difficulty set in groups. i.e easy in one group, medium in another, difficult in another and runs the operators
        // _id: 'null', //this puts all the data set in one group and runs the remaining operators
        count: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' }, //calculates the ratings average and stores it to a variable
        avgPrice: { $avg: '$price' }, //calculates price average and stores it to a variable
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await TourModel.aggregate([
    { $unwind: '$startDates' }, //this will create a new tour for every 'date' in the startDates field.
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`), //This selects just the tours that have a start date of between january first 2021 and december 31st 2021. assuming year is 2021
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //groups the months in startDates together
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, //this will create an array that will have the name of every tour that each month contains
      },
    },
    { $addFields: { month: '$_id' } }, //creates a field called month and assigns it to the value of id which is actually the month
    {
      $project: {
        //project is for removing fields. simply assign zero to remove a field
        _id: 0,
      },
    },
    { $sort: { numTourStarts: -1 } }, //sort the number of tour starts in descending order
    { $limit: 12 },
  ]);
  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

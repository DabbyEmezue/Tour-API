const User = require('./../Models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const express = require('express');
const AppError = require('../utils/appError');
const { findByIdAndUpdate } = require('./../Models/userModel');
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

///For a User to update his details
exports.updateMe = async (req, res, next) => {
  //1) Create an error if user tries to update Password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'this route is not for password Update. Please Use /UpdateMyPassword',
        400
      )
    );
  }
  //2) Update Doc
  const filteredBody = filterObj(req.body, 'name', 'email'); // this keeps only the name and email fields from req.body cos thats what we want to change only
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true /* returns the updated doucment*/,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { user: updatedUser } });
};

exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({ status: 'success', data: null });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

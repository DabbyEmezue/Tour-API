const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../Models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); //the secret key is a key for the encoding. the expires is how long before the token expires and logs out the user. these variables are stored in config.env
};

////////////////////////////////////////////////////////////////

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const token = signToken(newUser._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: false, //will only be sent on a secure connection(HTTPS), set it to true during production
    httpOnly: true, //makes it so that the cookie cannot be modified by the browser in any way
  }); //name of the cookie, what you're sending in the cookie, options

  res.status(201).json({
    status: 'success',
    token,
    data: { user: newUser },
  });
});

///////////////////////////////////////////////////////////////

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //const email = req.body.email (same as password)

  //check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //check if user exists and if password matches
  const user = await User.findOne({ email: email }).select('+password'); //we need to manually select password because we turned it off from showing in the output from the schema in userModel
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //if everything is okay, send token to client

  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: false, //will only be sent on a secure connection(HTTPS), set it to true during production
    httpOnly: true, //makes it so that the cookie cannot be modified by the browser in any way
  }); //name of the cookie, what you're sending in the cookie, options

  res.status(200).json({ status: 'success', token });
});

//////////////////////////////////////////////////

exports.protect = catchAsync(async (req, res, next) => {
  //getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // the token is stored in the req.header under authorization. It starts with Bearer djbjkdhasdnasdhsadsajd. So we split it at the space which then creates an array with two elements of which we return the second element i.e sjdbnsndasdsdas
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please Log In to get Access', 401)
    );
  }
  //verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The User belonging to the token no longer exists', 401)
    );
  }
  //check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }
  req.user = freshUser;
  console.log(req.user);
  next();
});

exports.restrictTo = (...roles) => {
  return (res, req, next) => {
    //roles is an array
    if (!roles.includes(req.user.role)) {
      //if there are no those specified roles in the req.user.role
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //Get User based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No User with that email address'), 404);
  }
  //Generate Reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //Send the link to the to User as an email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset token (valid for 10 min)',
      message,
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the message. Try again later',
        500
      )
    );
  }
  res.status(200).json({ status: 'success', message: 'Token sent to email' });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get User based in Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  //2) If Token has not expired and there is a user, set the new password

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3) Update ChangedPasswordAt Property
  //4) Log the User in, send JWT
  const token = signToken(user._id);
  res.status(200).json({ status: 'success', token });
});

//////////////////////////////////////////////////////////////////////////

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get User From Collection
  const user = await User.findById(req.user.id).select('+password');

  //2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your Current Password is Wrong', 401));
  }

  //3) If So, update Password

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) Log User in, send JWT

  const token = signToken(user._id);
  res.status(200).json({ status: 'Password Updated Successfully', token });
});

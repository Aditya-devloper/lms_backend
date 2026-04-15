const User = require("../models/userModel");

module.exports.isOwner = (req, res, next) => {
  const user = req.user;
  if (user.user_type == "owner") return next();

  return res.status(403).json({
    status: false,
    message: "You are not authorized to perform this action",
  });
};

module.exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to perform this action",
      });
    }

    next();
  };
};

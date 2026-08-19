const passport = require("passport");

exports.authMiddleware = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    req.user = user;

    next();
  })(req, res, next);
};

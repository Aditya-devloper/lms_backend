const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const User = require("../models/userModel");
const Agent = require("../models/agentModel");

module.exports = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    // jwtFromRequest: (req) => req.cookies.token,
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        if (jwt_payload.user_type === "owner") {
          const user = await User.findById(jwt_payload.userId);
          return done(null, user || false);
        } else if (jwt_payload.user_type === "agent") {
          const agent = await Agent.findById(jwt_payload.agentId);
          return done(null, agent || false);
        } else {
          return done(null, false);
        }
      } catch (error) {
        return done(error, false);
      }
    }),
  );
};

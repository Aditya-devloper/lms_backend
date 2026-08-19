const { body } = require("express-validator");
const { isValidPhoneNumber } = require("libphonenumber-js");

module.exports.validateEmail = [
  body("email").isEmail().withMessage("Please provide a valid email address"),
];

module.exports.validateEmailPass = [
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

module.exports.validateUser = [
  body("email")
    .notEmpty()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("phone")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error("Phone number is invalid");
      }

      return true;
    }),
];

module.exports.validateLead = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email is invalid"),

  body("phone")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error("Phone number is invalid");
      }

      return true;
    }),

  body("follow_up_date").notEmpty().withMessage("Follow-up date is required"),
];

module.exports.validateBusiness = [
  body("business_name").notEmpty().withMessage("Business Name is required"),
  body("business_email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email is invalid"),

  body("business_phone")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error("Phone number is invalid");
      }

      return true;
    }),
];

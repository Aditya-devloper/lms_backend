const { body } = require("express-validator");

module.exports.validateEmail = [
  body("email").isEmail().withMessage("Please provide a valid email address"),
];

module.exports.validateUser = [
  body("email")
    .notEmpty()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("phone")
    .optional({ checkFalsy: true })
    .isMobilePhone("any")
    .withMessage("Phone number is invalid"),
];

module.exports.validateLead = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email is invalid"),
  body("phone")
    .optional({ checkFalsy: true })
    .isMobilePhone("any")
    .withMessage("Phone number is invalid"),
  body("follow_up_date").notEmpty().withMessage("Follow-up date is required"),
  body("assigned_to").notEmpty().withMessage("Assigned to is required"),
  body("business").notEmpty().withMessage("Business is required"),
];

module.exports.validateBusiness = [
  body("business_name").notEmpty().withMessage("Business Name is required"),
  body("business_email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email is invalid"),
  body("business_phone")
    .optional({ checkFalsy: true })
    .isMobilePhone("any")
    .withMessage("Phone number is invalid"),
];

const Joi = require("joi");

const userSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  verified: Joi.forbidden().default(0),
});

module.exports = userSchema;

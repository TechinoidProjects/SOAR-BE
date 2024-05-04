// VALIDATION
const Joi = require('joi');
const { joiPassword} = require('joi-password');

const saveUserValidations = (data) => {
    const schema = Joi.object({
        username: Joi.string().required(),
        password : joiPassword.required(),
        email: Joi.string().email({
            minDomainSegments: 2,
            tlds: {
                allow: ['com', 'net', 'tv', 'id']
            }
        }),
    });
    return schema.validate(data);
};
module.exports = {
    saveUserValidations,
}
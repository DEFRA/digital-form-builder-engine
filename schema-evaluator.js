const joi = require('joi')

class SchemaEvaluator {
  static itPasses (hasFormComponents, stateSchema, scopedState, conditionOptions) {
    if (!hasFormComponents) {
      // we don't yet support schemas for non form builder components
      return false
    }
    const error = joi.validate(scopedState || {}, stateSchema.required(), conditionOptions).error
    return (error === null)
  }
}

module.exports = SchemaEvaluator

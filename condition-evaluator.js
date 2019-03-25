class ConditionEvaluator {
  static eval (condition, conditions, state) {
    if (conditions[condition]) {
      if ((conditions[condition]).fn(state)) {
        return true
      }
      return false
    } else {
      throw new Error('condition not specified in conditions list')
    }
  }
}

module.exports = ConditionEvaluator

const joi = require('joi')

class SummaryViewModel {
  constructor (model, state) {
    const details = []

    ;[undefined].concat(model.sections).forEach((section, index) => {
      const items = []
      const sectionState = section
        ? (state[section.name] || {})
        : state

      model.pages.forEach(page => {
        if (page.section === section) {
          page.components.formItems.forEach(component => {
            items.push({
              name: component.name,
              path: component.path,
              label: component.title,
              value: component.getDisplayStringFromState(sectionState),
              url: `${page.path}?returnUrl=/summary`
            })
          })
        }
      })

      details.push({ name: section && section.name, title: section && section.title, items })
    })

    const schema = model.schema
    const result = joi.validate(state, schema, { abortEarly: false })

    if (result.error) {
      this.errors = result.error.details.map(err => {
        const name = err.path[err.path.length - 1]

        return {
          path: err.path.join('.'),
          name: name,
          message: err.message
        }
      })
      this.hasErrors = true

      details.forEach(detail => {
        const sectionErr = this.errors.find(err => err.path === detail.name)

        detail.items.forEach(item => {
          if (sectionErr) {
            item.inError = true
            return
          }

          const err = this.errors.find(err => err.path === (detail.name ? (detail.name + '.' + item.name) : item.name))
          if (err) {
            item.inError = true
          }
        })
      })
    }

    this.result = result
    this.details = details
    this.showPDF = !this.hasErrors
    this.value = state
  }
}

module.exports = { SummaryViewModel }

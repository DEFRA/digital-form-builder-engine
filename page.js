const parseJSON = require('jsonic')

const joi = require('joi')
const { proceed } = require('./helpers')
const { ComponentCollection } = require('./components')

const FORM_SCHEMA = Symbol('FORM_SCHEMA')
const STATE_SCHEMA = Symbol('STATE_SCHEMA')

class Page {
  constructor (model, pageDef) {
    const { def } = model

    // Properties
    this.def = def
    this.model = model
    this.pageDef = pageDef
    this.path = pageDef.path
    this.title = pageDef.title

    // Resolve section
    const section = pageDef.section &&
      model.sections.find(s => s.name === pageDef.section)

    this.section = section

    // Components collection
    // const components = makeComponentCollection(pageDef.components, def)
    const components = new ComponentCollection(pageDef.components, model)
    this.components = components
    this.hasFormComponents = !!components.formItems.length

    // Schema
    this[FORM_SCHEMA] = this.components.formSchema
    this[STATE_SCHEMA] = this.components.stateSchema

    // Navigation
    this.hasNext = Array.isArray(pageDef.next) && pageDef.next.length > 0

    if (this.hasNext) {
      this.next = pageDef.next.slice().sort((a, b) => {
        return a.if ? (!b.if ? -1 : 0) : (b.if ? 1 : 0)
      })

      this.next.forEach(next => {
        if (next.if) {
          // First look for a condition by name
          // and evaluate using the global state
          const conditions = model.conditions
          const condition = conditions[next.if]

          if (condition) {
            next.if = function (state) {
              return !!condition.fn(state)
            }
          } else {
            // Otherwise parse inline condition
            // and evaluate using the local state
            const obj = parseJSON(next.if)
            const schema = Array.isArray(obj)
              ? joi.alternatives(obj)
              : joi.object(obj)

            const fn = (value) => {
              const conditionOptions = this.conditionOptions

              const isValid = !joi.validate(value, schema, conditionOptions).error
              return isValid
            }

            next.if = function (state) {
              return !!fn(section ? state[section.name] : state, state)
            }
          }
        }
      })
    }
  }

  getViewModel (formData, errors) {
    let showTitle = true
    let pageTitle = this.title
    const sectionTitle = this.section && this.section.title
    const components = this.components.getViewModel(formData, errors)
    const formComponents = components.filter(c => c.isFormComponent)
    const hasSingleFormComponent = formComponents.length === 1
    const singleFormComponent = hasSingleFormComponent && formComponents[0]
    const singleFormComponentIsFirst = singleFormComponent && singleFormComponent === components[0]

    if (hasSingleFormComponent && singleFormComponentIsFirst) {
      const label = singleFormComponent.model.label

      if (this.section) {
        label.html =
          `<span class="govuk-caption-xl">${this.section.title}</span> ${label.text}`
      }

      label.isPageHeading = true
      label.classes = 'govuk-label--xl'
      pageTitle = label.text
      showTitle = false
    }

    return { page: this, pageTitle, sectionTitle, showTitle, components, errors }
  }

  getNext (state) {
    if (this.hasNext) {
      const next = this.next.find(n => !n.if || n.if(state))

      if (!next) {
        return this.defaultNextPath
      }

      return next.path
    } else {
      return this.defaultNextPath
    }
  }

  getFormDataFromState (state) {
    const pageState = this.section ? state[this.section.name] : state
    return this.components.getFormDataFromState(pageState || {})
  }

  getStateFromValidForm (formData) {
    return this.components.getStateFromValidForm(formData)
  }

  getErrors (validationResult) {
    if (validationResult && validationResult.error) {
      return {
        titleText: this.errorSummaryTitle,
        errorList: validationResult.error.details.map(err => {
          const name = err.path.map((name, index) => index > 0 ? `__${name}` : name).join('')

          return {
            path: err.path.join('.'),
            href: `#${name}`,
            name: name,
            text: err.message
          }
        })
      }
    }
  }

  validate (value, schema) {
    const result = joi.validate(value, schema, this.validationOptions)
    const errors = result.error ? this.getErrors(result) : null

    return { value: result.value, errors }
  }

  validateForm (payload) {
    return this.validate(payload, this.formSchema)
  }

  validateState (newState) {
    return this.validate(newState, this.stateSchema)
  }

  makeGetRouteHandler (getState) {
    return async (request, h) => {
      const state = await getState(request)
      const formData = this.getFormDataFromState(state)
      return h.view(this.viewName, this.getViewModel(formData))
    }
  }

  makePostRouteHandler (mergeState) {
    return async (request, h) => {
      const payload = request.payload
      const formResult = this.validateForm(payload)

      if (formResult.errors) {
        return h.view(this.viewName, this.getViewModel(payload, formResult.errors))
      } else {
        const newState = this.getStateFromValidForm(formResult.value)
        const stateResult = this.validateState(newState)

        if (stateResult.errors) {
          return h.view(this.viewName, this.getViewModel(payload, stateResult.errors))
        } else {
          const update = this.getPartialMergeState(stateResult.value)

          const state = await mergeState(request, update)

          return this.proceed(request, h, state)
        }
      }
    }
  }

  makeGetRoute (getState) {
    return {
      method: 'get',
      path: this.path,
      options: this.getRouteOptions,
      handler: this.makeGetRouteHandler(getState)
    }
  }

  makePostRoute (mergeState) {
    return {
      method: 'post',
      path: this.path,
      options: this.postRouteOptions,
      handler: this.makePostRouteHandler(mergeState)
    }
  }

  proceed (request, h, state) {
    return proceed(request, h, this.getNext(state))
  }

  getPartialMergeState (value) {
    return this.section ? { [this.section.name]: value } : value
  }

  get viewName () { return 'index' }
  get defaultNextPath () { return '/summary' }
  get validationOptions () { return { abortEarly: false } }
  get conditionOptions () { return this.model.conditionOptions }
  get errorSummaryTitle () { return 'Fix the following errors' }
  get getRouteOptions () { return {} }
  get postRouteOptions () { return {} }
  get formSchema () { return this[FORM_SCHEMA] }
  set formSchema (value) { this[FORM_SCHEMA] = value }
  get stateSchema () { return this[STATE_SCHEMA] }
  set stateSchema (value) { this[STATE_SCHEMA] = value }
}

module.exports = Page

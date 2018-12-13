const joi = require('joi')
const componentTypes = require('../component-types')
const nunjucks = require('nunjucks')
const path = require('path')
const createConditionalComponents = Symbol('createConditionalComponents')
const getSchemaKeys = Symbol('getSchemaKeys')

class Component {
  constructor (def, model) {
    Object.assign(this, def)
    this.model = model
  }

  getViewModel () { return {} }
}

class FormComponent extends Component {
  constructor (def, model) {
    super(def, model)
    this.isFormComponent = true
  }

  getFormDataFromState (state) {
    const name = this.name

    if (name in state) {
      return {
        [name]: this.getFormValueFromState(state)
      }
    }
  }

  getFormValueFromState (state) {
    const name = this.name

    if (name in state) {
      return state[name] === null ? '' : state[name].toString()
    }
  }

  getStateFromValidForm (payload) {
    const name = this.name

    return {
      [name]: this.getStateValueFromValidForm(payload)
    }
  }

  getStateValueFromValidForm (payload) {
    const name = this.name

    return (name in payload && payload[name] !== '')
      ? payload[name]
      : null
  }

  getViewModel (formData, errors) {
    const options = this.options
    const isOptional = options.required === false
    const label = this.title + (isOptional ? ' (optional)' : '')

    const name = this.name
    const model = {
      label: {
        text: label,
        classes: 'govuk-label--s'
      },
      id: name,
      name: name,
      value: formData[name]
    }

    if (this.hint) {
      model.hint = {
        html: this.hint
      }
    }

    if (options.classes) {
      model.classes = options.classes
    }

    if (errors) {
      errors.errorList.forEach(err => {
        if (err.name === name) {
          model.errorMessage = {
            text: err.text
          }
        }
      })
    }

    return model
  }

  getFormSchemaKeys () { return { [this.name]: joi.any() } }
  getStateSchemaKeys () { return { [this.name]: joi.any() } }
  getDisplayStringFromState (state) { return state[this.name] }
}

let Types = null
function getType (name) {
  if (Types === null) {
    Types = {}
    componentTypes.forEach(componentType => {
      Types[componentType.name] = require(`./${componentType.name.toLowerCase()}`)
    })
  }

  return Types[name]
}

// An ES 6 class providing conditional reveal support for radio buttons (https://design-system.service.gov.uk/components/radios/)
// and checkboxes (https://design-system.service.gov.uk/components/checkboxes/)
class ConditionalFormComponent extends FormComponent {
  constructor (def, model) {
    super(def, model)
    const { options } = this
    const list = model.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    this.list = list
    this.items = items
    this.values = values
    this[createConditionalComponents](def, model)
  }

  addConditionalComponents (item, itemModel, formData, errors) {
    // The gov.uk design system Nunjucks examples for conditional reveal reference variables from macros. There does not appear to
    // to be a way to do this in JavaScript. As such, render the conditional components with Nunjucks before the main view is rendered.
    // The conditional html tag used by the gov.uk design system macro will reference HTML rarther than one or more additional
    // gov.uk design system macros.
    if (item.conditional) {
      itemModel.conditional = {
        html: nunjucks.render('conditional-components.html', { components: item.conditional.componentCollection.getViewModel(formData, errors) })
      }
    }
    return itemModel
  }

  getFormSchemaKeys () {
    return this[getSchemaKeys]('form')
  }

  getStateFromValidForm (payload) {
    const state = super.getStateFromValidForm(payload)
    const filteredItems = this.list.items.filter(item => item.conditional && item.conditional.components)
    filteredItems.forEach(item => {
      Object.assign(state, item.conditional.componentCollection.getStateFromValidForm(payload))
    })
    // Remove payload values associated with unrevealed conditional content so that state schema validaton succeeds.
    Object.keys(state).filter(key => !state[key]).map(key => delete state[key])
    return state
  }

  getStateSchemaKeys () {
    return this[getSchemaKeys]('state')
  }

  [createConditionalComponents] (def, model) {
    const filteredItems = this.list.items.filter(item => item.conditional && item.conditional.components)
    // Create a collection of conditional components that can be converted to a view model and rendered by Nunjucks
    // before primary view model rendering takes place.
    filteredItems.map(item => {
      item.conditional.componentCollection = new ComponentCollection(item.conditional.components, model)
    })
  }

  [getSchemaKeys] (schemaType) {
    const schemaName = `${schemaType}Schema`
    const schemaKeysFunctionName = `get${schemaType.substring(0, 1).toUpperCase()}${schemaType.substring(1)}SchemaKeys`
    const filteredItems = this.items.filter(item => item.conditional && item.conditional.componentCollection)
    const conditionalName = this.name
    const schemaKeys = { [conditionalName]: this[schemaName] }
    // All conditional component values are submitted regardless of their visibilty.
    // As such create Joi validation rules such that:
    // a) When a conditional component is visible it is required.
    // b) When a conditional component is not visible it is optional.
    filteredItems.forEach(item => {
      const conditionalSchemaKeys = item.conditional.componentCollection[schemaKeysFunctionName]()
      // Iterate through the set of components handled by conditional reveal adding Joi validation rules
      // based on whether or not the component controlling the conditional reveal is selected.
      Object.keys(conditionalSchemaKeys).forEach(key => {
        Object.assign(schemaKeys, {
          [key]: joi.alternatives().when(conditionalName, {
            is: item.value,
            then: conditionalSchemaKeys[key].required(),
            otherwise: conditionalSchemaKeys[key].optional().allow('')
          })
        })
      })
    })
    return schemaKeys
  }
}

class ComponentCollection {
  constructor (items, model) {
    const itemTypes = items.map(def => {
      const Type = getType(def.type)
      return new Type(def, model)
    })

    const formItems = itemTypes.filter(component => component.isFormComponent)

    this.items = itemTypes
    this.formItems = formItems
    this.formSchema = joi.object().keys(this.getFormSchemaKeys()).required()
    this.stateSchema = joi.object().keys(this.getStateSchemaKeys()).required()
  }

  getFormSchemaKeys () {
    const keys = {}

    this.formItems.forEach(item => {
      Object.assign(keys, item.getFormSchemaKeys())
    })

    return keys
  }

  getStateSchemaKeys () {
    const keys = {}

    this.formItems.forEach(item => {
      Object.assign(keys, item.getStateSchemaKeys())
    })

    return keys
  }

  getFormDataFromState (state) {
    const formData = {}

    this.formItems.forEach(item => {
      Object.assign(formData, item.getFormDataFromState(state))
    })

    return formData
  }

  getStateFromValidForm (payload) {
    const state = {}

    this.formItems.forEach(item => {
      Object.assign(state, item.getStateFromValidForm(payload))
    })

    return state
  }

  getViewModel (formData, errors) {
    return this.items.map(item => {
      return {
        type: item.type,
        isFormComponent: item.isFormComponent,
        model: item.getViewModel(formData, errors)
      }
    })
  }
}

// Configure Nunjucks to allow rendering of content that is revealed conditionally.
nunjucks.configure([path.resolve(__dirname, '../views/components/'), path.resolve(__dirname, '../views/partials/'), path.resolve(__dirname, '../node_modules/govuk-frontend/components/')])
module.exports = { Component, FormComponent, ConditionalFormComponent, ComponentCollection }

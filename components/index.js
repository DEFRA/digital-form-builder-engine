const vm = require('vm')
const joi = require('joi')
const moment = require('moment')
const defSchema = require('./schema')
const { buildFormSchema, buildStateSchema } = require('./helpers')
const errorSummaryTitle = 'Fix the following errors'

const componentTypes = [
  {
    name: 'TextField',
    title: 'Text field',
    subType: 'form'
  },
  {
    name: 'MultilineTextField',
    title: 'Multiline text field',
    subType: 'form'
  },
  {
    name: 'YesNoField',
    title: 'Yes/No field',
    subType: 'form'
  },
  {
    name: 'DateField',
    title: 'Date field',
    subType: 'form'
  },
  {
    name: 'TimeField',
    title: 'Time field',
    subType: 'form'
  },
  {
    name: 'DateTimeField',
    title: 'Date time field',
    subType: 'form'
  },
  {
    name: 'DatePartsField',
    title: 'Date parts field',
    subType: 'form'
  },
  {
    name: 'DateTimePartsField',
    title: 'Date time parts field',
    subType: 'form'
  },
  {
    name: 'SelectField',
    title: 'Select field',
    subType: 'form'
  },
  {
    name: 'RadiosField',
    title: 'Radios field',
    subType: 'form'
  },
  {
    name: 'CheckboxesField',
    title: 'Checkboxes field',
    subType: 'form'
  },
  {
    name: 'NumberField',
    title: 'Number field',
    subType: 'form'
  },
  {
    name: 'UkAddressField',
    title: 'Uk address field',
    subType: 'form'
  },
  {
    name: 'TelephoneNumberField',
    title: 'Telephone number field',
    subType: 'form'
  },
  {
    name: 'EmailAddressField',
    title: 'Email address field',
    subType: 'form'
  },
  {
    name: 'Para',
    title: 'Paragraph',
    subType: 'content'
  },
  {
    name: 'Html',
    title: 'Html',
    subType: 'content'
  },
  {
    name: 'InsetText',
    title: 'Inset text',
    subType: 'content'
  },
  {
    name: 'Details',
    title: 'Details',
    subType: 'content'
  }
]

function getFormSchemaKeys (name, schemaType, component) {
  const schema = buildFormSchema(schemaType, component)

  return function () {
    return { [name]: schema }
  }
}

function getStateSchemaKeys (name, schemaType, component) {
  const schema = buildStateSchema(schemaType, component)

  return function () {
    return { [name]: schema }
  }
}

const makeComponentTypes = {
  DateField (component) {
    const { name, options } = component

    if (!options.classes) {
      options.classes = 'govuk-input--width-10'
    }

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'date', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'date', component),
      getFormDataFromState (state) {
        const value = state[name]
        return {
          [name]: value instanceof Date
            ? moment(value).format('YYYY-MM-DD')
            : value
        }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        return value instanceof Date
          ? moment(value).format('D MMMM YYYY')
          : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)
        viewModel.type = 'date'
        return viewModel
      }
    }
  },
  DateTimeField (component) {
    const { name, options } = component

    if (!options.classes) {
      options.classes = 'govuk-input--width-20'
    }

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'date', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'date', component),
      getFormDataFromState (state) {
        const value = state[name]
        return {
          [name]: value instanceof Date
            ? moment(value).format('YYYY-MM-DDTHH:mm')
            : value
        }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        return value instanceof Date
          ? moment(value).format('D MMMM YYYY h:mma')
          : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)
        viewModel.type = 'datetime-local'
        return viewModel
      }
    }
  },
  TextField (component) {
    const { name, schema } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'string', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'string', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        if (typeof schema.max === 'number') {
          viewModel.attributes = {
            maxlength: schema.max
          }
        }

        return viewModel
      }
    }
  },
  MultilineTextField (component) {
    const { name, schema, options } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'string', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'string', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        if (typeof schema.max === 'number') {
          viewModel.attributes = {
            maxlength: schema.max
          }
        }

        if (options.rows) {
          viewModel.rows = options.rows
        }

        return viewModel
      }
    }
  },
  NumberField (component) {
    const { name } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'number', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'number', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)
        viewModel.type = 'number'
        return viewModel
      }
    }
  },
  EmailAddressField (component) {
    // Defaults
    component.schema.email = true

    if (!component.options.classes) {
      component.options.classes = 'govuk-input--width-20'
    }

    const { name, schema } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'string', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'string', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        if (typeof schema.max === 'number') {
          viewModel.attributes = {
            maxlength: schema.max
          }
        }

        viewModel.type = 'email'

        return viewModel
      }
    }
  },
  DatePartsField (component, def) {
    const { name, options } = component
    const stateSchema = buildStateSchema('date', component)

    const components = makeComponentCollection([
      { type: 'NumberField', name: `${name}__day`, title: 'Day', schema: { min: 1, max: 31 }, options: { required: options.required, classes: 'govuk-input--width-2' } },
      { type: 'NumberField', name: `${name}__month`, title: 'Month', schema: { min: 1, max: 12 }, options: { required: options.required, classes: 'govuk-input--width-2' } },
      { type: 'NumberField', name: `${name}__year`, title: 'Year', schema: { min: 1000, max: 3000 }, options: { required: options.required, classes: 'govuk-input--width-4' } }
    ], def)

    return {
      getFormSchemaKeys () {
        return components.getFormSchemaKeys()
      },
      getStateSchemaKeys (keys) {
        return { [name]: stateSchema }
      },
      getFormDataFromState (state) {
        const value = state[name]
        return {
          [`${name}__day`]: value && value.getDate(),
          [`${name}__month`]: value && value.getMonth() + 1,
          [`${name}__year`]: value && value.getFullYear()
        }
      },
      getStateFromValidForm (payload) {
        // Use `moment` to parse the date as
        // opposed to the Date constructor.
        // `moment` will check that the individual date
        // parts together constitute a valid date.
        // E.g. 31 November is not a valid date
        return {
          [name]: payload[`${name}__year`]
            ? moment([
              payload[`${name}__year`],
              payload[`${name}__month`] - 1,
              payload[`${name}__day`]
            ]).toDate()
            : null
        }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        return value instanceof Date
          ? moment(value).format('D MMMM YYYY')
          : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        // Todo: Remove after next
        // release on govuk-frontend
        viewModel.name = undefined

        // Use the component collection to generate the subitems
        const componentViewModels = components.getViewModel(formData, errors).map(vm => vm.model)

        // Remove the labels and apply error classes to the items
        componentViewModels.forEach(componentViewModel => {
          componentViewModel.label = componentViewModel.label.text.replace(' (optional)', '')
          if (componentViewModel.errorMessage) {
            componentViewModel.classes += ' govuk-input--error'
          }
        })

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          items: componentViewModels
        })

        return viewModel
      }
    }
  },
  DateTimePartsField (component, def) {
    const { name, options } = component
    const stateSchema = buildStateSchema('date', component)

    const components = makeComponentCollection([
      { type: 'NumberField', name: `${name}__day`, title: 'Day', schema: { min: 1, max: 31 }, options: { required: options.required, classes: 'govuk-input--width-2' } },
      { type: 'NumberField', name: `${name}__month`, title: 'Month', schema: { min: 1, max: 12 }, options: { required: options.required, classes: 'govuk-input--width-2' } },
      { type: 'NumberField', name: `${name}__year`, title: 'Year', schema: { min: 1000, max: 3000 }, options: { required: options.required, classes: 'govuk-input--width-4' } },
      { type: 'NumberField', name: `${name}__hour`, title: 'Hour', schema: { min: 0, max: 23 }, options: { required: options.required, classes: 'govuk-input--width-2' } },
      { type: 'NumberField', name: `${name}__minute`, title: 'Minute', schema: { min: 0, max: 59 }, options: { required: options.required, classes: 'govuk-input--width-2' } }
    ], def)

    return {
      getFormSchemaKeys () {
        return components.getFormSchemaKeys()
      },
      getStateSchemaKeys (keys) {
        return { [name]: stateSchema }
      },
      getFormDataFromState (state) {
        const value = state[name]
        return {
          [`${name}__day`]: value && value.getDate(),
          [`${name}__month`]: value && value.getMonth() + 1,
          [`${name}__year`]: value && value.getFullYear(),
          [`${name}__hour`]: value && value.getHours(),
          [`${name}__minute`]: value && value.getMinutes()
        }
      },
      getStateFromValidForm (payload) {
        // Use `moment` to parse the date as
        // opposed to the Date constructor.
        // `moment` will check that the individual date
        // parts together constitute a valid date.
        // E.g. 31 November is not a valid date
        return {
          [name]: payload[`${name}__year`]
            ? moment([
              payload[`${name}__year`],
              payload[`${name}__month`] - 1,
              payload[`${name}__day`],
              payload[`${name}__hour`],
              payload[`${name}__minute`]
            ]).toDate()
            : null
        }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        return value instanceof Date
          ? moment(value).format('D MMMM YYYY h:mma')
          : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        // Todo: Remove after next
        // release on govuk-frontend
        viewModel.name = undefined

        // Use the component collection to generate the subitems
        const componentViewModels = components.getViewModel(formData, errors).map(vm => vm.model)

        // Remove the labels and apply error classes to the items
        componentViewModels.forEach(componentViewModel => {
          componentViewModel.label = componentViewModel.label.text.replace(' (optional)', '')
          if (componentViewModel.errorMessage) {
            componentViewModel.classes += ' govuk-input--error'
          }
        })

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          items: componentViewModels
        })

        return viewModel
      }
    }
  },
  RadiosField (component, def) {
    const { name, options } = component
    const list = def.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    const formSchema = buildFormSchema(list.type, component, options.required !== false).valid(values)
    const stateSchema = buildStateSchema(list.type, component).valid(values)

    return {
      getFormSchemaKeys: function () {
        return { [name]: formSchema }
      },
      getStateSchemaKeys: function () {
        return { [name]: stateSchema }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        const item = items.find(item => item.value === value)
        return item ? item.text : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          items: items.map(item => {
            const itemModel = {
              html: item.text,
              value: item.value,
              // Do a loose string based check as state may or
              // may not match the item value types.
              checked: '' + item.value === '' + formData[name]
            }

            if (options.bold) {
              itemModel.label = {
                classes: 'govuk-label--s'
              }
            }

            if (item.description) {
              itemModel.hint = {
                html: item.description
              }
            }

            return itemModel
          })
        })

        return viewModel
      }
    }
  },
  CheckboxesField (component, def) {
    const { name, options } = component
    const list = def.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    const itemSchema = joi[list.type]().valid(values)
    const itemsSchema = joi.array().items(itemSchema)
    const alternatives = joi.alternatives([itemSchema, itemsSchema])
    const formSchema = buildFormSchema(alternatives, component, options.required !== false)
    const stateSchema = buildStateSchema(alternatives, component)

    return {
      getFormSchemaKeys: function () {
        return { [name]: formSchema }
      },
      getStateSchemaKeys: function () {
        return { [name]: stateSchema }
      },
      getDisplayStringFromState (state) {
        if (name in state) {
          const value = state[name]

          if (value === null) {
            return ''
          }

          const checked = Array.isArray(value) ? value : [value]
          return checked.map(check => items.find(item => item.value === check).text).join(', ')
        }
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)
        let formDataItems = []

        if (name in formData) {
          formDataItems = Array.isArray(formData[name])
            ? formData[name]
            : formData[name].split(',')
        }

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          items: items.map(item => {
            const itemModel = {
              text: item.text,
              value: item.value,
              // Do a loose string based check as state may or
              // may not match the item value types.
              checked: !!formDataItems.find(i => '' + item.value === i)
            }

            if (options.bold) {
              itemModel.label = {
                classes: 'govuk-label--s'
              }
            }

            if (item.description) {
              itemModel.hint = {
                html: item.description
              }
            }

            return itemModel
          })
        })

        return viewModel
      }
    }
  },
  SelectField (component, def) {
    const { name, options } = component
    const list = def.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    const formSchema = buildFormSchema('string'/* list.type */, component) // .valid(values)
    const stateSchema = buildStateSchema(list.type, component).valid(values)

    return {
      getFormSchemaKeys: function () {
        return { [name]: formSchema }
      },
      getStateSchemaKeys: function () {
        return { [name]: stateSchema }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        const item = items.find(item => item.value === value)
        return item ? item.text : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        Object.assign(viewModel, {
          items: [{ text: '' }].concat(items.map(item => {
            return {
              text: item.text,
              value: item.value,
              // Do a loose check as state may or
              // may not match the item value types
              selected: '' + item.value === '' + formData[name]
            }
          }))
        })

        return viewModel
      }
    }
  },
  YesNoField (component, def) {
    const { name, options } = component

    // Defaults
    options.list = '__yesNo'

    if (!options.classes) {
      options.classes = 'govuk-radios--inline'
    }

    const list = def.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    const formSchema = buildFormSchema(list.type, component, options.required !== false).valid(values)
    const stateSchema = buildStateSchema(list.type, component).valid(values)

    return {
      getFormSchemaKeys: function () {
        return { [name]: formSchema }
      },
      getStateSchemaKeys: function () {
        return { [name]: stateSchema }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        const item = items.find(item => item.value === value)
        return item ? item.text : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          items: items.map(item => {
            return {
              text: item.text,
              value: item.value,
              // Do a loose string based check as state may or
              // may not match the item value types.
              checked: '' + item.value === '' + formData[name]
            }
          })
        })

        return viewModel
      }
    }
  },
  TelephoneNumberField (component) {
    // Defaults
    if (!component.options.classes) {
      component.options.classes = 'govuk-input--width-10'
    }

    const { name, schema } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'string', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'string', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        if (typeof schema.max === 'number') {
          viewModel.attributes = {
            maxlength: schema.max
          }
        }

        viewModel.type = 'tel'

        return viewModel
      }
    }
  },
  TimeField (component) {
    // Defaults
    if (!component.options.classes) {
      component.options.classes = 'govuk-input--width-4'
    }

    const { name } = component

    return {
      getFormSchemaKeys: getFormSchemaKeys(name, 'string', component),
      getStateSchemaKeys: getStateSchemaKeys(name, 'string', component),
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)
        viewModel.type = 'time'
        return viewModel
      }
    }
  },
  UkAddressField (component, def) {
    const { name, options } = component

    // Component collection
    const childFormComponentList = [
      { type: 'TextField', name: `premises`, title: 'Premises', schema: { max: 100 }, options: { required: options.required } },
      { type: 'TextField', name: `street`, title: 'Street', schema: { max: 100, allow: '' }, options: { required: false } },
      { type: 'TextField', name: `locality`, title: 'Locality', schema: { max: 100, allow: '' }, options: { required: false } },
      { type: 'TextField', name: `town`, title: 'Town', schema: { max: 100 }, options: { required: options.required } },
      { type: 'TextField', name: `postcode`, title: 'Postcode', schema: { max: 10 }, options: { required: options.required } }
    ]
    const stateComponents = makeComponentCollection(childFormComponentList, def)

    // Modify the name to add a prefix and reuse
    // the children to create the formComponents
    childFormComponentList.forEach(child => (child.name = `${name}__${child.name}`))

    const formComponents = makeComponentCollection(childFormComponentList, def)

    return {
      children: formComponents,
      getFormSchemaKeys () {
        return formComponents.getFormSchemaKeys()
      },
      getStateSchemaKeys () {
        return {
          [name]: options.required === false
            ? joi.object().keys(stateComponents.getStateSchemaKeys()).allow(null)
            : joi.object().keys(stateComponents.getStateSchemaKeys()).required()
        }
      },
      getFormDataFromState (state) {
        const value = state[name]
        return {
          [`${name}__premises`]: value && value.premises,
          [`${name}__street`]: value && value.street,
          [`${name}__locality`]: value && value.locality,
          [`${name}__town`]: value && value.town,
          [`${name}__postcode`]: value && value.postcode
        }
      },
      getStateFromValidForm (payload) {
        return {
          [name]: payload[`${name}__premises`] ? {
            premises: payload[`${name}__premises`],
            street: payload[`${name}__street`],
            locality: payload[`${name}__locality`],
            town: payload[`${name}__town`],
            postcode: payload[`${name}__postcode`]
          } : null
        }
      },
      getDisplayStringFromState (state) {
        const value = state[name]
        return value ? [
          value.premises,
          value.street,
          value.locality,
          value.town,
          value.postcode
        ].filter(p => {
          return !!p
        }).join(', ') : ''
      },
      getViewModel (formData, errors) {
        const viewModel = getBaseFormFieldViewModel(component, formData, errors)

        Object.assign(viewModel, {
          fieldset: {
            legend: viewModel.label
          },
          children: formComponents.getViewModel(formData, errors)
        })

        return viewModel
      }
    }
  },
  Para (component) {
    return {
      getViewModel () {
        return {
          content: component.content
        }
      }
    }
  },
  Html (component) {
    return {
      getViewModel () {
        return {
          content: component.content
        }
      }
    }
  },
  Details (component) {
    return {
      getViewModel () {
        return {
          summaryHtml: component.title,
          html: component.content
        }
      }
    }
  },
  InsetText (component) {
    return {
      getViewModel () {
        return {
          content: component.content
        }
      }
    }
  }
}

const formComponents = componentTypes.filter(t => t.subType === 'form').map(t => t.name)

function isFormComponent (component) {
  return formComponents.indexOf(component.type) > -1
}

function getBaseFormFieldViewModel (component, formData, errors) {
  const options = component.options
  const isOptional = options.required === false
  const label = component.title + (isOptional ? ' (optional)' : '')

  const name = component.name
  const model = {
    label: {
      text: label,
      classes: 'govuk-label--s'
    },
    id: name,
    name: name,
    value: formData[name]
  }

  if (component.hint) {
    model.hint = {
      html: component.hint
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

function makeComponent (componentDef, def) {
  const component = {
    type: componentDef.type,
    isFormComponent: isFormComponent(componentDef),
    options: componentDef.options,
    getViewModel () { return {} }
  }

  if (component.isFormComponent) {
    const name = componentDef.name
    const schema = componentDef.schema

    Object.assign(component, {
      name: name,
      hint: componentDef.hint,
      title: componentDef.title,
      schema: schema,
      getFormSchemaKeys () { return { [name]: joi.any() } },
      getStateSchemaKeys () { return { [name]: joi.any() } },
      getFormDataFromState (state) {
        if (name in state) {
          return { [name]: state[name] === null ? '' : state[name].toString() }
        }
      },
      getStateFromValidForm (payload) {
        return {
          [name]: (name in payload && payload[name] !== '') ? payload[name] : null
        }
      },
      getDisplayStringFromState (state) { return state[name] }
    })
  }

  const componentType = makeComponentType(componentDef, def)

  Object.assign(component, componentType)

  return component
}

function makeComponentCollection (list, def) {
  const items = list.map(componentDef => makeComponent(componentDef, def))
  const formItems = items.filter(component => component.isFormComponent)

  const collection = {}

  collection.items = items
  collection.formItems = formItems

  collection.getFormSchemaKeys = function () {
    const keys = {}

    formItems.forEach(item => {
      Object.assign(keys, item.getFormSchemaKeys())
    })

    return keys
  }

  collection.getStateSchemaKeys = function () {
    const keys = {}

    formItems.forEach(item => {
      Object.assign(keys, item.getStateSchemaKeys())
    })

    return keys
  }

  collection.getFormDataFromState = function (state) {
    const formData = {}

    formItems.forEach(item => {
      Object.assign(formData, item.getFormDataFromState(state))
    })

    // return Object.assign.apply(Object, [{}].concat(formItems.map(item =>
    //   item.getFormDataFromState(state))))
    return formData
  }

  collection.getStateFromValidForm = function (payload) {
    const state = {}

    formItems.forEach(item => {
      Object.assign(state, item.getStateFromValidForm(payload))
    })

    return state
  }

  collection.getViewModel = function (formData, errors) {
    return items.map(item => {
      return {
        type: item.type,
        isFormComponent: item.isFormComponent,
        model: item.getViewModel(formData, errors)
      }
    })
  }

  collection.formSchema = joi.object().keys(collection.getFormSchemaKeys())
  collection.stateSchema = joi.object().keys(collection.getStateSchemaKeys())

  return collection
}

function makeComponentType (component, def) {
  return makeComponentTypes[component.type](component, def)
}

function makeModel (def) {
  const result = joi.validate(def, defSchema, { abortEarly: false })

  if (result.error) {
    throw result.error
  }

  // Make a clone of the shallow copy returned
  // by joi so as not to change the source data.
  def = JSON.parse(JSON.stringify(result.value))

  // Add default lists
  def.lists.push({
    name: '__yesNo',
    title: 'Yes/No',
    type: 'boolean',
    items: [
      {
        text: 'Yes',
        value: true
      },
      {
        text: 'No',
        value: false
      }
    ]
  })

  const model = {
    lists: def.lists,
    sections: def.sections
  }

  model.pages = def.pages.map(pageDef => {
    const page = {}

    // Properties
    page.path = pageDef.path
    page.title = pageDef.title

    // Resolve section
    page.section = pageDef.section && def.sections.find(s => s.name === pageDef.section)

    // Components collection
    const components = makeComponentCollection(pageDef.components, def)
    page.components = components
    page.hasFormComponents = !!components.formItems.length

    // API
    page.getFormDataFromState = function (state) {
      const pageState = page.section ? state[page.section.name] : state
      return page.components.getFormDataFromState(pageState || {})
    }

    page.getStateFromValidForm = function (formData) {
      return page.components.getStateFromValidForm(formData)
    }

    page.getViewModel = function (formData, validationResult) {
      let errors = null
      let showTitle = true
      let pageTitle = page.title
      const sectionTitle = page.section && page.section.title

      if (validationResult && validationResult.error) {
        errors = {
          titleText: errorSummaryTitle,
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

      const components = page.components.getViewModel(formData, errors)
      const formComponents = components.filter(c => c.isFormComponent)
      const hasSingleFormComponent = formComponents.length === 1
      const singleFormComponent = hasSingleFormComponent && formComponents[0]
      const singleFormComponentIsFirst = singleFormComponent && singleFormComponent === components[0]

      if (hasSingleFormComponent && singleFormComponentIsFirst) {
        const label = singleFormComponent.model.label

        if (page.section) {
          label.html =
            `<span class="govuk-caption-xl">${page.section.title}</span> ${label.text}`
        }

        label.isPageHeading = true
        label.classes = 'govuk-label--xl'
        pageTitle = label.text
        showTitle = false
      }

      return { page, pageTitle, sectionTitle, showTitle, components, errors }
    }

    // Schema
    page.formSchema = page.components.formSchema
    page.stateSchema = page.components.stateSchema

    // Navigation
    page.hasNext = Array.isArray(pageDef.next) && pageDef.next.length > 0

    if (page.hasNext) {
      page.next = pageDef.next.slice().sort((a, b) => {
        return a.if ? (!b.if ? -1 : 0) : (b.if ? 1 : 0)
      })

      page.next.forEach(next => {
        if (next.if) {
          // Use this for now. Some alternatives I've looked into are:
          // `jexl`, `filtrex`, `jsrules`, `expr-eval`, `safe-eval`.
          // There's a minor security concern generally with this `vm` approach
          // but it's a step up from `eval/new Function`. See
          // https://odino.org/eval-no-more-understanding-vm-vm2-nodejs/#conclusion
          const script = new vm.Script(`
            with (state) {
              ${next.if}
            }`
          )

          const fn = function (state, context) {
            return script.runInNewContext({ state, context }, { timeout: 2000 })
          }

          next.if = function (state) {
            try {
              return !!fn(page.section ? state[page.section.name] : state, state)
            } catch (err) {
              return false
            }
          }
        }
      })
    }

    page.getNext = function (state) {
      if (page.hasNext) {
        const next = page.next.find(n => !n.if || n.if(state))

        if (!next) {
          return '/summary'
          // throw new Error('No next route found')
        }

        return next.path
      } else {
        return '/summary'
      }
    }

    return page
  })

  // Entire model schema
  const keys = {}
  const sectionSchema = {}
  ;[undefined].concat(model.sections).forEach(section => {
    const sectionPages = model.pages.filter(page => page.section === section)

    if (section) {
      const sectionKeys = {}
      sectionPages.forEach(sectionPage => {
        Object.assign(sectionKeys, sectionPage.components.getStateSchemaKeys())
      })
      sectionSchema[section.name] = keys[section.name] = joi.object().required().keys(sectionKeys)
    } else {
      sectionPages.forEach(sectionPage => {
        Object.assign(keys, sectionPage.components.getStateSchemaKeys())
      })
    }
  })

  model.schema = joi.object().required().keys(keys)
  model.sectionSchema = sectionSchema

  return model
}

module.exports = { makeModel }

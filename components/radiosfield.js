const { FormComponent } = require('.')
const helpers = require('./helpers')

class RadiosField extends FormComponent {
  constructor (def, model) {
    super(def, model)

    const { options } = this
    const list = model.lists.find(list => list.name === options.list)
    const items = list.items
    const values = items.map(item => item.value)
    const formSchema = helpers.buildFormSchema(list.type, this, options.required !== false).valid(values)
    const stateSchema = helpers.buildStateSchema(list.type, this).valid(values)

    this.list = list
    this.items = items
    this.formSchema = formSchema
    this.stateSchema = stateSchema
  }

  getFormSchemaKeys () {
    return { [this.name]: this.formSchema }
  }

  getStateSchemaKeys () {
    return { [this.name]: this.stateSchema }
  }

  getDisplayStringFromState (state) {
    const { name, items } = this
    const value = state[name]
    const item = items.find(item => item.value === value)
    return item ? item.text : ''
  }

  getViewModel (formData, errors) {
    const { name, items, options } = this
    const viewModel = super.getViewModel(formData, errors)

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

module.exports = RadiosField

const joi = require('joi')
const boom = require('boom')
const pkg = require('./package.json')
const addressService = require('./address-service')
const { SummaryViewModel } = require('./models')

module.exports = {
  plugin: {
    name: pkg.name,
    version: pkg.version,
    dependencies: 'vision',
    register: (server, options) => {
      const { model, ordnanceSurveyKey } = options

      model.pages.forEach(page => {
        // GET
        server.route(page.makeGetRoute(model.getState))

        // POST
        server.route(page.makePostRoute(model.mergeState))
      })

      // SUMMARY
      server.route({
        method: 'get',
        path: '/summary',
        handler: async (request, h) => {
          const state = await model.getState(request)
          const viewModel = new SummaryViewModel(model, state)

          return h.view('summary', viewModel)
        }
      })

      // FIND ADDRESS
      server.route({
        method: 'get',
        path: '/find-address',
        handler: async (request, h) => {
          try {
            const results = await addressService(ordnanceSurveyKey, request.query.postcode)

            return results
          } catch (err) {
            return boom.badImplementation('Failed to find addresses', err)
          }
        },
        options: {
          validate: {
            query: {
              postcode: joi.string().required()
            }
          }
        }
      })
    }
  }
}

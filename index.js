const joi = require('joi')
const boom = require('boom')
const pkg = require('./package.json')
const addressService = require('./address-service')

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
        if (page.hasFormComponents) {
          server.route(page.makePostRoute(model.mergeState))
        }
      })

      // FIND ADDRESS
      server.route({
        method: 'get',
        path: '/__/find-address',
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

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const lodash = require('lodash');
const co = require('co');
const _ = require('underscore');

class ModelGenerater {
    constructor(dir, dbConfig) {
        this.dir = dir
        this.sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
            host: dbConfig.host,
            dialect: dbConfig.adapter,
            port: dbConfig.port,
            omitNull: true
        })
    }

    generate() {
        let db = {}
        let query
        let sequelize = this.sequelize

        fs.readdirSync(this.dir)
        .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'))
        .forEach((file) => {
            let model = sequelize.import(path.join(this.dir, file))

            db[model.name] = model
        })

        Object.keys(db).forEach((modelName) => {
            let methods = [
                'bulkUpdate',
                'bulkCreate'
            ]

            if ('associate' in db[modelName]) {
                db[modelName].associate(db)
            }

            _.each(methods, (method) => {
                let superMethod = db[modelName][method]

                db[modelName][method] = (values, options) => co(function* () {
                    yield superMethod.call(db[modelName], values, options)
                })
            })
        })

        query = (sql, queryTypes, replacements) => {
            process.on('unhandledRejection', (err) => { throw new Error(err) })
            process.on('uncaughtException', (err) => { throw new Error(err) })

            return sequelize.query(sql, { type: queryTypes, replacements })
        }

        return lodash.extend({ Sequelize, sequelize, query }, db)
    }
}

module.exports = ModelGenerater

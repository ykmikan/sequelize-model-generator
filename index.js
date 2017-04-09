import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import lodash from 'lodash'
import co from 'co'
import _ from 'underscore'

class ModelGenerater {

    constructor(dir, dbConfig) {
        this.dir = dir
        this.sequelize = new Sequelize(dbConfig.db, dbConfig.username, dbConfig.password, {
            host: dbConfig.host,
            dialect: 'postgres',
            port: '3306',
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

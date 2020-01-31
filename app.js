/**
 * Lexeme primary key URL GET requests
 * e.g. http://pielexicon.hum.helsinki.fi/5c3f83c34a61c67674a84466 for
 * PIE *nebɑɦos, OCS. nebo- (n.) ‘Himmel’ 
 */

//database address and port; edit as appropriate
let url = "mongodb://localhost:27017" //assuming default port of 27017

let MongoClient = require('mongodb').MongoClient

let failureCallback = (error) => {
    console.error(error)
}

/**
 * Read primary key from URL and assign properties to data object
 */
let read = () => new Promise (
    (resolve, reject) => {
        if (typeof middlewareCache != "undefined") {
            app.get('/:key', middlewareCache, (req, res) => {
                let key = req.params.key
                let tree = {}
                let result = {}
                let data = {req, res, key, tree, result}
                resolve(data)
            })
        } else {
            reject(new Error("middlewareCache undefined"))
        }
    }
)

/**
 * Render tree
 */
let renderTree = data => new Promise (
    (resolve, reject) => {
        if (typeof pie != "undefined") {
            pie.render(data.req, data.res, tree => {
                Users.getUsers(callback => {
                    data.tree.users = callback
                    data.tree = tree
                    resolve(data)
                })
            })
        } else {
            reject(new Error("object 'pie' undefined"))
        }
    }
)

/**
 * Render header of webpage
 */
let header = data => new Promise (
    (resolve, reject) => {
        data.res.render('header', data.tree, (error, html) => {
            if (error) {
                reject(new Error(error))
            } else {
                Cache.store(data.req, html, done => {
                    data.res.write(html)
                    resolve(data)
                })
            }
        })
    }
)

/**
 * Connect to database, look up and get lexeme 
 */
let lookup = data => new Promise (
    (resolve, reject) => {
        if (typeof url != "undefined") {
            MongoClient.connect(url, (error, client) => {
                if (error) {
                    reject(new Error(error))
                } else {
                    console.log("Connected correctly to database server")
                    let database = client.db("test")
                    let ObjectId = require('mongodb').ObjectID
                    database.collection("pies").find(
                        {"_id": ObjectId(data.key)}
                        ).toArray((error, result) => {
                            if (error) {
                                reject(new Error(error))
                            } else {
                                client.close()
                                data.result = result
                                resolve(data)
                            }
                        })
                }
            })
        } else {
            reject(new Error("'url' database address object undefined"))
        }
    }
)

/**
 * Display error message if primary key not in database;
 * render lexeme information in browser if primary key found in database
 */
let displayEntry = data => new Promise (
    (resolve, reject) => {
        switch(data.result[0]) {
            case undefined: {
                data.res.write(
                    '<h3>Not available.</h3>'+
                        '<h3>Please check number.</h3>',
                    (error, html) => {
                        if (error) {
                            reject(new Error(error))
                        } else {
                            resolve(data)
                        }
                    }
                )
                break
            }
            default: {
                let entryData = data.result[0]
                data.res.render('entry', entryData, (error, html) => {
                    if (error) {
                        reject(new Error(error))
                    } else {
                        data.res.write(html)
                        resolve(data)
                    }
                })
            }
        }
    }
)

/**
 * Render webpage footer
 */
let footer = data => new Promise (
    (resolve, reject) => {
        data.res.render('footer', data.tree, (error, html) => {
            if (error) {
                reject(new Error(error))
            } else {
                Cache.store(data.req, html, done => data.res.write(html))
            }
        })
    }
)

/**
 * Get Lexeme by URL request promise chain and error catch-all
 */
read()
.then(renderTree)
.then(header)
.then(lookup)
.then(displayEntry)
.then(footer)
.catch(failureCallback)

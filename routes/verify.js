//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities').pool

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

const generateHash = require('../utilities').generateHash

const router = express.Router()

//Pull in the JWT module along with out a secret key
const jwt = require('jsonwebtoken')
const config = {
    secret: process.env.JSON_WEB_TOKEN
}

/**
 * @api {get} /verify Request to verify an email in the system
 * @apiName GetVerify
 * @apiGroup Verify
 * 
 * @apiDescription Request to verify an email address in the system.
 * 
 * @apiParam {String} id the JWT for verifying the email.
 * 
 * @apiSuccess {boolean} success true when the JWT is found and the database is updated.
 * @apiSuccess {String} message "Verification successful!""
 * 
 *  * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 OK
 *     {
 *       "success": true,
 *       "message": "Verification successful!",
 *     }
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing id query parameter"
 * 
 * @apiError (403: Invalid Token) {String} message "Token is incorrect"
 * 
 * @apiError (400: Verification Failed) {String} message "Verification failed"
 * 
 * @apiError (400: Other Error) {String} message "Other, error, see detail"
 * @apiError (400: Other Error) {String} detail Information about the error
 * 
 */ 
 router.get('/', (request, response, next) => {
    if (isStringProvided(request.query.id)) {
        next()
    } else {
        console.log(error)
        response.status(400).send({
            message: "Missing id query parameter"
        })
    }
}, (request, response) => {
    const token = request.query.id;
    try {
        jwt.verify(token, config.secret, (error, decoded) => {
            if (error) {
                console.log(error)
                response.status(403).send({
                    message: "Token is incorrect"
                })
            } else {
                const email = decoded.email;
                let theQuery = "UPDATE members SET verification = 1 WHERE email= $1"
                let values = [email]
                console.log(theQuery)
                pool.query(theQuery, values)
                    .then(result => {
                        // response.status(201).send({
                        //     success: true,
                        //     message: 'Verification successful!'
                        // })
                        response.status(201).writeHead(200, {'Content-Type': 'text/html'});
                        response.write('<h style="color:blue">Congratulations! Your email has been registered.' +
                        'You may now exit the page and enjoy the app!</h>'); 
                        response.end(); //end the response
                    })
                    .catch((error) => {
                        console.log(error)
                        response.status(400).send({
                            message: "Verification failed"
                        })
                    })
            }
        });
    } catch (error) {

        console.log(error)
        response.status(400).send({
            message: "Other error, see detail",
            detail: error.detail
        })
    }
    console.log("end of the line")
})

module.exports = router

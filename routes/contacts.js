//express is the framework we're going to use to handle requests
const express = require('express')

var router = express.Router()

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool


const validation = require('../utilities/exports').validation
let isStringProvided = validation.isStringProvided


/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {post} /demosql Request to add someone's name to the DB
 * @apiName PostDemoSql
 * @apiGroup DemoSql
 * 
 * @apiParam {String} name someone's name *unique
 * @apiParam {String} message a message to store with the name
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {String} message the inserted name
 * 
 * @apiError (400: Name exists) {String} message "Name exists"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.post("/", (request, response) => {
    if (isStringProvided(request.body.user) && isStringProvided(request.body.contact)) {
        //Inserting user_a = sender and user_b = receiver
        const theQuery = "INSERT INTO CONTACTS(memberid_a, memberid_b) VALUES ($1, $2) RETURNING *"
        const values = [request.body.user, request.body.contact]

        pool.query(theQuery, values)
            .then(result => {
                response.status(201).send({
                    success: true,
                    message: "Inserted: " + result.rows[0].name
                })
            })
            .catch(err => {
                //log the error
                console.log(err)
                if (err.constraint == "contact_name_key") {
                    response.status(400).send({
                        message: "Name exists"
                    })
                } else {
                    response.status(400).send({
                        message: err.detail
                    })
                }
            }) 
            
    } else {
        response.status(400).send({
            message: "Missing required information"
        })

    }  
})


/**
 * @api {get} /contacts/:name? Request to get all contact entries in the DB
 * @apiName GetContactSql
 * @apiGroup ContactSql
 * 
 * @apiParam {String} [name] the contacts to look up. 
 * 
 * @apiSuccess {boolean} success true when the name is inserted
 * @apiSuccess {Object[]} names List of user (contacts) in the Contacts DB
 * @apiSuccess {String} contacts.memberid_b The contact in relation to memberid_a
 * @apiSuccess {String} contacts.verified The verification status of contact
 * 
 * @apiError (404: ID Not Found) {String} message "ID not found"

 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * @apiError (400: Missing User ID) {String} message "Missing User ID"
 * 
 * @apiUse JSONError
 */ 
 router.get("/:id?", (request, response) => {

    //const theQuery = 'SELECT contacts.memberid_b, contacts.verified, members.firstname FROM ((Contacts INNER JOIN firstname ON contact.memberid_b = members.memberid) (Contacts WHERE memberid_a=$1)'
    const theQuery = 'SELECT members.email, contacts.verified, contacts.memberid_b FROM contacts INNER JOIN members ON contacts.memberid_b = members.memberid  WHERE contacts.memberid_a=$1;'
    let values = [request.params.id]

    //No name was sent so SELECT on all
    //is there a reason to do this?
    if (isStringProvided(request.params.id)) {



    pool.query(theQuery, values)
        .then(result => {
            if (result.rowCount > 0) {
                response.send({
                    success: true,
                    contacts: result.rows
                })
            } else {
                response.status(404).send({
                    message: "ID not found"
                })
            }
        })
        .catch(err => {
            //log the error
            // console.log(err.details)
            response.status(400).send({
                message: err.detail
            })
        })
        
    } else {
        response.status(400).send({
            message: "Missing User ID"
        })
    }
    (request, response) => {
        // send a notification of this message to ALL members with registered tokens
        let query = `SELECT members.firstname, contacts.memberid_b INNER JOIN Contacts ON
                        Push_Token.memberid=ChatMembers.memberid
                        WHERE ChatMembers.chatId=$1`
        let values = [request.body.chatId]
        pool.query(query, values)
            .then(result => {
                console.log(request.decoded.email)
                console.log(request.body.message)
                result.rows.forEach(entry => 
                    msg_functions.sendMessageToIndividual(
                        entry.token, 
                        response.message))
                response.send({
                    success:true
                })
            }).catch(err => {

                response.status(400).send({
                    message: "SQL Error on select from push token",
                    error: err
                })
            })
        }
})


/**
 * @api {put} /contactsql Request to update contact verification and name
 * @apiName PutContactsSql
 * @apiGroup ContactsSql
 * 
 * @apiParam {String} verification status of contact
 * @apiParam {String} contact id of associated contact
 * @apiParam {String} user id of associated user
 * 
 * @apiSuccess {boolean} success true when the contact is updated
 * @apiSuccess {String} message Updated user ID x contact ID y to verification status z
 * 
 * @apiError (404: Name Not Found) {String} message "Contact info not found"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.put("/", (request, response) => {

    if (isStringProvided(request.body.verification) && isStringProvided(request.body.contact) && isStringProvided(request.body.user)) {
        const theQuery = "UPDATE Contacts SET verified = $1 WHERE memberid_b = $2 AND memberid_a = $3 RETURNING *"
        const values = [request.body.verification, request.body.contact, request.body.user]
        console.log(theQuery)
        pool.query(theQuery, values)
            .then(result => {
                if (result.rowCount > 0) {
                    response.send({
                        success: true,
                        message: "Updated user ID " + result.rows[0].memberid_a + " contact ID " + result.rows[0].memberid_b + " to verification status " + result.rows[0].verified
                    })
                } else {
                    response.status(404).send({
                        message: "Contact info not found"
                    })
                }
            })
            .catch(err => {
                //log the error
                // console.log(err)
                response.status(400).send({
                    message: err.detail
                })
            }) 
    } else {
        response.status(400).send({
            message: "Missing required information"
        })
    } 
})

/**
 * @api {delete} /contact/:user-contact Request to remove entry in the DB for name
 * @apiName DeleteContactSql
 * @apiGroup ContactSql
 * 
 * @apiParam {String} user_contact the userID and contactID separated by an underscore
 * 
 * @apiSuccess {boolean} success true when the contact relation is deleted
 * @apiSuccess {String} message the userID and contactID deleted
 * 
 * @apiError (404: User and Contact Not Found) {String} message "User and associated contact not found"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * @apiError (400: User and Contact not valid) {String} message "User and Contact must exist and have length greater than 0"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.delete("/:user_contact?", (request, response) => {
    const user = request.params.user_contact.split('_')[0]
    const contact = request.params.user_contact.split('_')[1]

    if (isStringProvided(request.params.user_contact) && !(user === undefined) && !(contact === undefined)) {
        
        const theQuery = "DELETE FROM Contacts WHERE memberid_a=" + user + " AND " + "memberid_b="+contact + " RETURNING *"
        console.log(theQuery)
        const values = [request.params.user_contact]

        pool.query(theQuery)
            .then(result => {
                if (result.rowCount == 1) {
                    response.send({
                        success: true,
                        message: "Deleted Contact: " + contact + " from user " + user
                    })
                } else {
                    response.status(404).send({
                        message: "User and associated contact not found"
                    })
                }
            })
            .catch(err => {
                //log the error
                // console.log(err)
                response.status(400).send({
                    message: err.detail
                })
            }) 
    } else if (user === undefined || contact === undefined) {
        response.status(400).send({
            message: "User and Contact must exist and have length greater than 0"
        })
    } else {
        response.status(400).send({
            message: "Missing required information"
        })
    } 
})

module.exports = router
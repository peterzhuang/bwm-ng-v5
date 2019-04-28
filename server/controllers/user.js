const User = require('../models/user');

const { normalizeErrors } = require('../helpers/mongoose');

const jwt = require('jsonwebtoken');

const config = require('../config/dev');

exports.auth = (req, res) => {
    const { email, password } = req.body;

    if (!password || !email) {
        return res.status(422).send({ error: [{ title: 'Data missing!', detail: 'Provide email and password!' }] });
    }

    User.findOne({ email }, (err, user) => {
        if (err) {
            return res.status(422).send({ errors: normalizeErrors(err.errors) });
        }

        if (!user) {
            return res.status(422).send({ error: [{ title: 'Invalid User!', detail: 'User does not exist' }] });
        }

        if (user.hasSamePassword(password)) {

            //return JWT token
            const token = jwt.sign({
                userId: user.id,
                username: user.username
            }, config.SECRET, { expiresIn: '1h' });

            return res.json(token);

        } else {
            return res.status(422).send({ error: [{ title: 'Wrong Data!', detail: 'Wrong email or password!' }] });
        }

    });

}

exports.register = (req, res) => {
    // const username = req.body.username;
    // const email = req.body.email;
    // const password = req.body.password;
    // const passwordConfirmation = req.body.passwordConfirmation;

    const { username, email, password, passwordConfirmation } = req.body;

    if (!password || !email) {
        return res.status(422).send({ error: [{ title: 'Data missing!', detail: 'Provide email and password!' }] });
    }

    if (password !== passwordConfirmation) {
        return res.status(422).send({ error: [{ title: 'Invalid Password!', detail: 'Password is not same as Password Confirmation!' }] });
    }

    User.findOne({ email }, (err, existingUser) => {
        if (err) {
            return res.status(422).send({ errors: normalizeErrors(err.errors) });
        }

        if (existingUser) {
            return res.status(422).send({ error: [{ title: 'Invalid Registration!', detail: 'User with this email already exists!' }] });
        }

        const user = new User({ username, email, password });

        user.save((err) => {
            if (err) {
                return res.status(422).send({ errors: normalizeErrors(err.errors) });
            }

            return res.json({ 'register': true });
        });

    })



}

exports.authMiddleware = function (req, res, next) {
    const token = req.headers.authorization;

    if (token) {
        const user = parseToken(token);

        User.findById(user.userId, (err, user) => {
            if (err) {
                return res.status(422).send({ errors: normalizeErrors(err.errors) });
            }

            if (user) {
                res.locals.user = user;
                next();
            } else {
                return notAuthorized(res);
            }

        })

    } else {
        return notAuthorized(res);

    }

}

function parseToken(token) {

    return jwt.verify(token.split(' ')[1], config.SECRET);

}

function notAuthorized(res) {
    return res.status(401).send({ error: [{ title: 'Not authorized!', detail: 'You need to login to get access!' }] });
}
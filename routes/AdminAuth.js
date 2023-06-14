const router = require("express").Router();
const trimRequest = require("trim-request");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require('fs');

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const adminPicture = require('../middlewares/AdminMulter');
const { uploadFile } = require("../S3_BUCKET/S3-bucket");

const { getEnv } = require("../config");

const {
    adminLoginValidation,
    adminRegisterValidation,
} = require("./validate");
const {
    getError,
    getSuccess,
    createAdminToken,
} = require("../helpers");

router.post("/admin_signup", [adminPicture, trimRequest.body], async(req, res) => {
    try {
        const { value, error } = adminRegisterValidation(req.body)
        if (error) {
            deleteUploadedFile(req)
            return res.status(400).send(getError(error.details[0].message))
        }
        if (req.file_error) {
            deleteUploadedFile(req)
            return res.status(400).send(getError(req.file_error));
        }
        if (!req.file) {
            return res.status(400).send(getError("Please upload a picture"))
        }
        // const { firstname, lastname, email, password } = value;
        const { sign_name } = value;
        const find = await prisma.zodiacSign.findFirst({
                where: {
                    sign_name,
                }
            })
            // const emialExist = await prisma.admin.findFirst({
            //     where: {
            //         email,
            //     }
            // })
            // if (emialExist) {
            //     deleteUploadedFile(req)
            //     return res.status(400).send(getError("Email already register for admin role"))
            // }
            // const hashPassword = bcrypt.hashSync(password, 10);
        const { Location } = await uploadFile(req.file)
            // console.log(Location);
        if (req.file) {
            const path = req.file.path
            if (fs.existsSync(path)) {
                fs.unlinkSync(path)
            }
        }
        // const newAdmin = await prisma.admin.create({
        //     data: {
        //         firstname,
        //         lastname,
        //         email,
        //         password: hashPassword,
        //         picture_url: Location,
        //     }
        // })
        const sign = await prisma.zodiacSign.update({
                where: {
                    id: find.id,
                },
                data: {
                    sign_picture: Location,
                }
            })
            // const sign = await prisma.zodiacSign.create({
            //     data: {
            //         sign_name,
            //         sign_picture: Location,
            //     }
            // })
        return res.status(200).send(getSuccess(sign))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message))
        }
        return res.status(400).send(getError(catchError))
    }
})

router.post("/admin_login", trimRequest.body, async(req, res) => {
    try {
        const { value, error } = adminLoginValidation(req.body)
        if (error) {
            return res.status(404).send(getError(error.details[0].message))
        }
        let { email, password } = value;

        const isValidPassword = bcrypt.compareSync(password, password = getEnv("ADMIN_PASSWORD"));

        if (email != getEnv("ADMIN_MAIL") || !isValidPassword) {
            return res.status(404).send(getError("Invalid Credentials"))
        }

        return res.status(200).send(getSuccess(createAdminToken()))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

module.exports = router;

function deleteUploadedFile(req) {
    try {
        if (req.file) {
            const path = req.file.path
            if (fs.existsSync(path)) {
                fs.unlinkSync(path)
            }
        }
        // req
        //     ?
        //     req.file ?
        //     req.file = ((file) => {
        //         console.log(file);
        //         fs.unlinkSync(file.path);
        //     }) :
        //     null :
        //     null;
    } catch (err) {}
}
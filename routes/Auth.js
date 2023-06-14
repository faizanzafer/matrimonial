const router = require("express").Router();
const fs = require("fs");
const trimRequest = require("trim-request");
const bcrypt = require("bcrypt");

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const uploadUserFile = require("../middlewares/FileMulter");
const adminMulter = require("../middlewares/AdminMulter");
const { uploadFile } = require("../S3_BUCKET/S3-bucket")


const { getEnv } = require("../config");
const {
    registerValidation,
    loginValidation,
    emailValidation,
    userNamelValidation,
} = require("./validate");
const {
    getError,
    getSuccess,
    clean,
    timeExpired,
    sendSuccess,
    createToken,
    sendError,
} = require("../helpers");
const {
    getExistingUserFromEmail,
    checkUserNameTaken,
    createUser,
    checkEmailAndPhoneExist,
    getUserFromPhone,
    getUserfromEmail,
} = require("../database_queries/Auth");
const { LogInApproval } = require(".prisma/client");
const Mailer = require("../Mailer");

router.post("/register", [uploadUserFile, trimRequest.body], async(req, res) => {
    try {
        if (req.file_error) {
            deleteUploadedFiles(req);
            return sendError(res, req.file_error);
        }

        if (!req.files.file) {
            return sendError(res, "Profile Picture is required.");
        }
        // if (!req.files.file && !req.files.pictures) {
        //     return sendError(res, "Profile Picture and Private Pictures are required.");
        // }

        if (!req.files.file || req.files.file.length < 1) {
            deleteUploadedFiles(req);
            return sendError(res, "Please upload Profile Picture.");
        }

        // if (!req.files.pictures || req.files.pictures.length < 1) {
        //     deleteUploadedFiles(req);
        //     return sendError(res, "Please upload atleast one Private Picture.");
        // }

        if (req.files.file.length > 1) {
            deleteUploadedFiles(req);
            return sendError(res, "You can upload only 1 Picture for Profile.");
        }

        // if (req.files.pictures.length > 6) {
        //     deleteUploadedFiles(req);
        //     return sendError(res, "You can upload only 6 Pictures in Private Pictures Section.");
        // }

        const { error, value } = registerValidation(req.body);
        if (error) {
            deleteUploadedFiles(req);
            return sendError(res, error.details[0].message);
        }

        const {
            firstname,
            lastname,
            user_name,
            email: _email,
            phone: _phone,
            password,
            gender: _gender,
            age,
            ziodic_sign: _ziodic_sign,
            education,
            height,
            status: _status,
            body_type: _body_type,
            profession: _profession,
            religion: _religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city: _city,
            country: _country,
            description,
            // social_auth_id,
        } = value;

        const email = _email.toLowerCase();
        const phone = _phone ? "+" + clean(_phone) : null;
        const gender = _gender.toLowerCase();
        const ziodic_sign = _ziodic_sign.toLowerCase();
        const status = _status.toLowerCase();
        const body_type = _body_type.toLowerCase();
        const profession = _profession.toLowerCase();
        const religion = _religion.toLowerCase();
        const city = _city.toLowerCase();
        const country = _country.toLowerCase();

        const emailExists = await getUserfromEmail(email);
        if (emailExists && emailExists.is_registered == true) {
            deleteUploadedFiles(req);
            return sendError(res, "Email already taken.");
        }

        const userNameExists = await checkUserNameTaken(user_name);
        if (userNameExists) {
            deleteUploadedFiles(req);
            return sendError(res, "User name already taken.");
        }
        if (phone) {
            const phoneExists = await getUserFromPhone(phone);
            if (phoneExists && phoneExists.is_registered == true) {
                deleteUploadedFiles(req);
                return sendError(res, "This phone number is already registered");
            }
        }

        if (!emailExists) {
            deleteUploadedFiles(req);
            return sendError(res, "First verify your email then continue.");
        }

        const newUser = await createUser(
            emailExists,
            firstname,
            lastname,
            user_name,
            email,
            phone,
            password,
            gender,
            age,
            ziodic_sign,
            education,
            height,
            status,
            body_type,
            profession,
            religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city,
            country,
            description
        );
        const profile = []

        for (const picture of req.files.file) {
            if (picture) {
                const { Location: profile_url } = await uploadFile(picture);
                profile.push({
                    profile_picture_url: profile_url,
                });
                if (fs.existsSync(picture.path)) {
                    fs.unlinkSync(picture.path)
                }
            }
        }

        const gallery = [];
        if(req.files.pictures){
        for (const file of req.files.pictures) {
            if (file) {
                const { Location } = await uploadFile(file);
                gallery.push({
                    user_id: newUser.id,
                    picture_url: Location,
                });
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
    }
        await prisma.userGallery.createMany({
            data: gallery,
        });
        const updatedUser = await prisma.users.update({
            where: {
                id: newUser.id,
            },
            data: {
                profile_picture_url: profile[0].profile_picture_url,
            },
        });

        await Mailer.sendMail(
            email,
            "Admin Approval",
            text = `<div style="background-color: #dc4fff; color: white;text-align: center; padding:20px; font-family: 'Times New Roman', Times, serif; font-size: 18px;">
            <h4>You are Successfully Register on <strong>PAK SHADI</strong> Application.<br>
             Please Wait for Admin Approval! </h4>
        </div>`
        )
        return sendSuccess(res, createToken(updatedUser));
    } catch (catchError) {
        deleteUploadedFiles(req);

        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
})

router.post("/user_register", [uploadUserFile, trimRequest.body], async(req, res) => {
    try {
        if (req.file_error) {
            deleteUploadedFiles(req);
            return sendError(res, req.file_error);
        }

        if (req.files.length <= 0) {
            return sendError(res, "Please upload atleast one picture.");
        }

        const { error, value } = registerValidation(req.body);
        if (error) {
            deleteUploadedFiles(req);
            return sendError(res, error.details[0].message);
        }

        const {
            firstname,
            lastname,
            user_name,
            email: _email,
            phone: _phone,
            password,
            gender: _gender,
            age,
            ziodic_sign: _ziodic_sign,
            education,
            height,
            status: _status,
            body_type: _body_type,
            profession: _profession,
            religion: _religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city: _city,
            country: _country,
            description,
            // social_auth_id,
        } = value;

        const email = _email.toLowerCase();
        const phone = _phone ? "+" + clean(_phone) : null;
        const gender = _gender.toLowerCase();
        const ziodic_sign = _ziodic_sign.toLowerCase();
        const status = _status.toLowerCase();
        const body_type = _body_type.toLowerCase();
        const profession = _profession.toLowerCase();
        const religion = _religion.toLowerCase();
        const city = _city.toLowerCase();
        const country = _country.toLowerCase();
        // if (phone.startsWith("+92")) {
        //   if (phone.length != 13)
        //     return res
        //       .status(400)
        //       .send(getError("Phone should be 10 character long."));
        // } else if (phone.startsWith("+234")) {
        //   if (phone.length != 14)
        //     return res
        //       .status(400)
        //       .send(getError("Phone should be 10 or 11 character long."));
        // } else
        //   return res
        //     .status(400)
        //     .send(getError("Phone can only starts with +92 or +234"));

        const emailExists = await getUserfromEmail(email);
        if (!emailExists) {
            deleteUploadedFiles(req);
            return sendError(res, "First verify your email then continue.");
        }

        if (emailExists.is_registered == true) {
            deleteUploadedFiles(req);
            return sendError(res, "Email already taken.");
        }

        // if (phone) {
        const phoneExists = await getUserFromPhone(phone);
        // }
        // if (!phoneExists)
        //   return res
        //     .status(400)
        //     .send(getError("This email and phone is already taken."));
        // const newUser = await createUser(
        //     emailExists,
        //     firstname,
        //     lastname,
        //     user_name,
        //     email,
        //     phone,
        //     password,
        //     gender,
        //     age,
        //     ziodic_sign,
        //     education,
        //     height,
        //     status,
        //     body_type,
        //     profession,
        //     religion,
        //     show_profile_picture,
        //     show_private_picture,
        //     longitude,
        //     latitude,
        //     city,
        //     country,
        //     description,
        // );
        // return res.send(newUser)
        // const gallery = [];
        // let { Location } = uploadFile(req.files)
        // console.log(Location);
        // for (const element of gallery) {
        //     if (req.files) {
        //         gallery.push({
        //             user_id: newUser.id,
        //             picture_url: Location,
        //         })
        //         console.log(element);
        //     }
        // }
        // if (req.file) {
        //     const path = req.file.path;
        //     if (fs.existsSync(path)) {
        //         fs.unlinkSync(path);
        //     }
        // }
        // req.files.forEach((file) => {
        //     const galleryFile = file ? file.path ?
        //         `${getEnv("APP_URL")}${file.path.split("public")[1]}` :
        //         null : null;
        //     if (galleryFile)
        //         gallery.push({
        //             user_id: newUser.id,
        //             picture_url: galleryFile,
        //         });
        // });

        // await prisma.userGallery.createMany({
        //     data: gallery,
        // });
        //     .send(getError("First verify your phone then continue."));

        if (phoneExists && phoneExists.is_registered == true) {
            deleteUploadedFiles(req);
            return sendError(res, "This phone number is already registered");
        }

        const userNameExists = await checkUserNameTaken(user_name);
        if (userNameExists) {
            deleteUploadedFiles(req);
            return sendError(res, "User name already taken.");
        }

        // const user = await checkEmailAndPhoneExist(email, phone);

        // if (!user)
        //   return res
        //     .status(400)
        //     .send(getError("This email and phone is already taken."));

        const newUser = await createUser(
            emailExists,
            firstname,
            lastname,
            user_name,
            email,
            phone,
            password,
            gender,
            age,
            ziodic_sign,
            education,
            height,
            status,
            body_type,
            profession,
            religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city,
            country,
            description
        );
        // return res.send(newUser)

        // req.files.forEach((file) => {
        //     const galleryFile = file ? file.path ?
        //         `${getEnv("APP_URL")}${file.path.split("public")[1]}` :
        //         null : null;
        //     if (galleryFile)
        //         gallery.push({
        //             user_id: newUser.id,
        //             picture_url: galleryFile,
        //         });
        // });
        const gallery = [];
        for (const file of req.files) {
            if (file) {
                const { Location } = await uploadFile(file);
                gallery.push({
                    user_id: newUser.id,
                    picture_url: Location,
                });
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
        }
        await prisma.userGallery.createMany({
            data: gallery,
        });
        const updatedUser = await prisma.users.update({
            where: {
                id: newUser.id,
            },
            data: {
                picture_url: gallery[0].picture_url,
            },
        });

        return sendSuccess(res, createToken(updatedUser));
    } catch (catchError) {
        deleteUploadedFiles(req);

        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/login", trimRequest.body, async(req, res) => {
    try {
        const { error, value } = loginValidation(req.body);
        if (error) return sendError(res, error.details[0].message);

        const { email: _email, password } = value;
        const email = _email.toLowerCase();

        const user = await prisma.users.findFirst({
            where: {
                email,
                is_registered: true,
                admin_approval: LogInApproval.APPROVED
            }
        })
        const emailExists = await getExistingUserFromEmail(email);
        if (!emailExists) {
            return sendError(res, "User with this email does not exist.");
        }
        if (emailExists && emailExists.is_social_login==true) {
            return sendError(res, "This email register for social login only!")
        }
        // if (!user) {
        //     return sendError(res, "You are not Approved for Log In!")
        // }

        if (emailExists.login_attempts >= 3)
            if (emailExists.locked_at) {
                if (!timeExpired({ time: emailExists.locked_at, p_minutes: 1 }))
                    return sendError(
                        res,
                        "You are locked for 1 minute. So try after 1 minute."
                    );

                if (timeExpired({ time: emailExists.locked_at, p_minutes: 10 }))
                    await prisma.users.update({
                        where: { id: emailExists.id },
                        data: {
                            locked_at: null,
                            login_attempts: 0,
                        },
                    });
            }

        const isValidPassword = bcrypt.compareSync(password, emailExists.password);
        if (!isValidPassword) {
            if (emailExists.login_attempts >= 3) {
                await prisma.users.update({
                    where: { id: emailExists.id },
                    data: {
                        locked_at: new Date(),
                        login_attempts: emailExists.login_attempts + 1,
                    },
                });
                return sendError(
                    res,
                    "You are locked for 1 minute. So try after 1 minute."
                );
            } else {
                await prisma.users.update({
                    where: { id: emailExists.id },
                    data: {
                        login_attempts: emailExists.login_attempts + 1,
                    },
                });
            }
            return sendError(res, "Password is not valid.");
        }

        await prisma.users.update({
            where: { id: emailExists.id },
            data: {
                locked_at: null,
                login_attempts: 0,
            },
        });

        return sendSuccess(res, createToken(emailExists));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/check_email", trimRequest.body, async(req, res) => {
    const { error, value } = emailValidation(req.body);
    if (error) return sendError(res, error.details[0].message);

    try {
        const { email: _email } = value;
        const email = _email.toLowerCase();
        const emailExists = await getExistingUserFromEmail(email);
        if (emailExists && emailExists.social_auth_id != null)
            return sendError(res, "Email registered for social login");
        else if (emailExists && emailExists.social_auth_id == null)
            return sendError(res, "Email registered for simple login");

        return res.send(getSuccess("You can use this email"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/check_user_name", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = userNamelValidation(req.body);
        if (error) return sendError(res, error.details[0].message);

        const { user_name } = value;
        const userNameExists = await checkUserNameTaken(user_name);
        if (userNameExists) return sendError(res, "User name already taken.");

        return res.send(getSuccess("You can use this user name"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

module.exports = router;

function deleteUploadedFiles(req) {
    try {
        // req
        // //    ?
        //     req.files.pictures ?
        //     req.files.pictures.forEach((file) => {
        //         // console.log(file);
        //         fs.unlinkSync(file.path);
        //     }) :
        //     null :
        //     null;

        if (req && req.files) {
            if (req.files.pictures && req.files.pictures.length > 0) {
                req.files.pictures.forEach(picture => {
                    if (fs.existsSync(picture.path))
                        fs.unlinkSync(picture.path)
                })
            }
            if (req.files.file && req.files.file.length > 0) {
                req.files.file.forEach(file => {
                    if (fs.existsSync(file.path))
                        fs.unlinkSync(file.path)
                })
            }
        }

    } catch (err) {}
}


// router.get("/get_zodiac_signs", async(req, res) => {
//     try {
//         const sign = await prisma.zodiacSign.findMany({
//             select: {
//                 id: true,
//                 sign_name: true,
//                 sign_picture: true,
//             }
//         })
//         return sendSuccess(res, sign);
//     } catch (catchError) {
//         if (catchError && catchError.message) {
//             return sendError(res, catchError.message);
//         }
//         return sendError(res, catchError);
//     }
// });